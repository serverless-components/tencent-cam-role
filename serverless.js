const { mergeDeepRight } = require('ramda')
const fs = require('fs')
const { Component } = require('@serverless/core')
const TencentLogin = require('tencent-login')
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
  roleName: 'QCS_SCFExcuteRole',
  description: 'This is tencent-cam-role component.',
  policy: {
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
    const cred = credentials.token
      ? new tencentcloud.common.Credential(secret_id, secret_key, credentials.token)
      : new tencentcloud.common.Credential(secret_id, secret_key)
    const httpProfile = new HttpProfile()
    httpProfile.reqTimeout = 30
    const clientProfile = new ClientProfile('HmacSHA256', httpProfile)
    return new CamClient(cred, region, clientProfile)
  }

  async doLogin() {
    const login = new TencentLogin()
    const tencent_credentials = await login.login()
    if (tencent_credentials) {
      tencent_credentials.timestamp = Date.now() / 1000
      try {
        const tencent = {
          SecretId: tencent_credentials.secret_id,
          SecretKey: tencent_credentials.secret_key,
          AppId: tencent_credentials.appid,
          token: tencent_credentials.token,
          expired: tencent_credentials.expired,
          signature: tencent_credentials.signature,
          uuid: tencent_credentials.uuid,
          timestamp: tencent_credentials.timestamp
        }
        await fs.writeFileSync('./.env_temp', JSON.stringify(tencent))
        this.context.debug(
          'The temporary key is saved successfully, and the validity period is two hours.'
        )
        return tencent
      } catch (e) {
        throw 'Error getting temporary key: ' + e
      }
    }
  }

  async getTempKey() {
    const that = this
    try {
      const data = await fs.readFileSync('./.env_temp', 'utf8')
      try {
        const tencent = {}
        const tencent_credentials_read = JSON.parse(data)
        if (Date.now() / 1000 - tencent_credentials_read.timestamp <= 6000) {
          return tencent_credentials_read
        }
        const login = new TencentLogin()
        const tencent_credentials_flush = await login.flush(
          tencent_credentials_read.uuid,
          tencent_credentials_read.expired,
          tencent_credentials_read.signature,
          tencent_credentials_read.AppId
        )
        if (tencent_credentials_flush) {
          tencent.SecretId = tencent_credentials_flush.secret_id
          tencent.SecretKey = tencent_credentials_flush.secret_key
          tencent.AppId = tencent_credentials_flush.appid
          tencent.token = tencent_credentials_flush.token
          tencent.expired = tencent_credentials_flush.expired
          tencent.signature = tencent_credentials_flush.signature
          tencent.uuid = tencent_credentials_read.uuid
          tencent.timestamp = Date.now() / 1000
          await fs.writeFileSync('./.env_temp', JSON.stringify(tencent))
          return tencent
        }
        return await that.doLogin()
      } catch (e) {
        return await that.doLogin()
      }
    } catch (e) {
      return await that.doLogin()
    }
  }

  async default(inputs = {}) {
    inputs = mergeDeepRight(defaults, inputs)

    let { tencent } = this.context.credentials
    if (!tencent) {
      tencent = await this.getTempKey(tencent)
      this.context.credentials.tencent = tencent
    }

    const cam = this.getCamClient(this.context.credentials.tencent, inputs.region)
    cam.sdkVersion = 'ServerlessComponent'

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
      const { policyList } = changed
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

    // we auto generate unconfigurable names
    if (this.state && this.state.roleName) {
      const oldRole = await getRole({ cam, ...this.state })
      if (this.state.roleName && this.state.roleName !== inputs.roleName && oldRole) {
        this.context.status(`Replacing`)
        this.context.debug(`Deleting/Replacing role ${inputs.name}.`)
        await deleteRole({ cam, roleName: this.state.roleName })
      }
    }

    this.state.name = inputs.name
    this.state.roleName = inputs.roleName
    this.state.roleDescription = inputs.description
    this.state.roleId = inputs.roleId
    this.state.service = inputs.service
    this.state.policy = inputs.policy
    this.state.region = inputs.region
    await this.save()

    this.context.debug(`Saved state for role ${inputs.name}.`)

    const outputs = {
      roleName: inputs.roleName,
      description: inputs.description,
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
    cam.sdkVersion = 'ServerlessComponent'

    this.context.debug(`Removing role ${this.state.name} from region ${this.state.region}.`)
    await deleteRole({ cam, ...this.state })
    this.context.debug(
      `Role ${this.state.name} successfully removed from region ${this.state.region}.`
    )

    const outputs = {
      roleName: this.state.roleName,
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
