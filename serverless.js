const { equals, mergeDeepRight } = require('ramda')
const { Component } = require('@serverless/core')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const CamClient = tencentcloud.cam.v20190116.Client
const ClientProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/client_profile.js')
const HttpProfile = require('tencentcloud-sdk-nodejs/tencentcloud/common/profile/http_profile.js')

const {
  createRole,
  deleteRole,
  getRole,
  addRolePolicy,
  removeRolePolicy,
  updateAssumeRolePolicy,
  inputsChanged,
  fullPolicyId
} = require('./utils')

const defaults = {
  service: ['scf.qcloud.com'],
  policy: {
    roleName: 'QCS_SCFExcuteRole',
    policyId: [],
    policyName: []
  },
  region: 'ap-guangzhou'
}

class TencentCamRole extends Component {
  getCamClient(credentials, region) {
    // create cam client

    const secret_id = credentials.SecretId
    const secret_key = credentials.SecretKey
    const cred = new tencentcloud.common.Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    return new CamClient(cred, region, clientProfile)
  }

  async default(inputs = {}) {
    inputs = mergeDeepRight(defaults, inputs)

    const cam = this.getCamClient(this.context.credentials.tencent, inputs.region)

    inputs = await fullPolicyId(cam, inputs)
    this.context.status(`Deploying`)

    inputs.name = this.state.name || this.context.resourceId()

    this.context.debug(`Syncing role ${inputs.name} in region ${inputs.region}.`)
    const prevRole = await getRole({ cam, ...inputs })
    // If an inline policy, remove roleId
    if (inputs.policy.version && inputs.policy.statement) {
      if (inputs.policy.roleId) {
        delete inputs.policy.roleId
      }
    }
    if (!prevRole) {
      this.context.debug(`Creating role ${inputs.name}.`)
      this.context.status(`Creating`)
      inputs.roleId = await createRole({ cam, ...inputs })
    } else {
      inputs.roleId = prevRole.roleId
      const changed = await inputsChanged(cam, prevRole, inputs)
      const serviceChanged = changed.service
      const policyChanged = changed.policy
      const policyList = changed.policyList
      if (serviceChanged) {
        this.context.status(`Updating`)
        this.context.debug(`Updating service for role ${inputs.name}.`)
        await updateAssumeRolePolicy({ cam, ...inputs })
      }
      if (policyChanged) {
        this.context.status(`Updating`)
        this.context.debug(`Updating policy for role ${inputs.name}.`)
        await removeRolePolicy({ cam, policyList, ...inputs })
        await addRolePolicy({ cam, ...inputs })
      }
    }

    // todo we probably don't need this logic now that
    // we auto generate unconfigurable names
    if (this.state.name && this.state.name !== inputs.name) {
      this.context.status(`Replacing`)
      this.context.debug(`Deleting/Replacing role ${inputs.name}.`)
      await deleteRole({ cam, name: this.state.name, policy: inputs.policy })
    }

    this.state.name = inputs.name
    this.state.roleId = inputs.roleId
    this.state.service = inputs.service
    this.state.policy = inputs.policy
    this.state.region = inputs.region
    await this.save()

    this.context.debug(`Saved state for role ${inputs.name}.`)

    const outputs = {
      name: inputs.name,
      roleId: inputs.roleId,
      service: inputs.service,
      policy: inputs.policy
    }

    this.context.debug(`Role ${inputs.name} was successfully deployed to region ${inputs.region}.`)
    this.context.debug(`Deployed role roleId is ${inputs.roleId}.`)

    return outputs
  }

  async remove() {

    this.context.status(`Removing`)

    if (!this.state.name) {
      this.context.debug(`Aborting removal. Role name not found in state.`)
      return
    }

    const cam = this.getCamClient(this.context.credentials.tencent, this.state.region)


    this.context.debug(`Removing role ${this.state.name} from region ${this.state.region}.`)
    await deleteRole({ cam, ...this.state })
    this.context.debug(
      `Role ${this.state.name} successfully removed from region ${this.state.region}.`
    )

    const outputs = {
      name: this.state.name,
      roleId: this.state.roleId || 'Removed',
      service: this.state.service,
      policy: this.state.policy
    }

    this.state = {}
    await this.save()

    return outputs
  }
}

module.exports = TencentCamRole
