const { utils } = require('@serverless/core')
const util = require('util')
const { equals, not, pick, type } = require('ramda')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const camModels = tencentcloud.cam.v20190116.Models

const AttachRolePolicyAction = async ({ cam, roleName, policyId }) => {
  const req = new camModels.AttachRolePolicyRequest()
  const body = {
    AttachRoleName: roleName,
    PolicyId: policyId
  }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.AttachRolePolicy.bind(cam))
  try {
    await handler(req)
  } catch (e) {
    throw e
  }
}

const addRolePolicy = async ({ cam, policy }) => {
  const roleName = policy.roleName
  let policyId = null
  if (type(policy.policyId) === 'Array') {
    for (let policyIndex = 0; policyIndex < policy.policyId.length; policyIndex++) {
      policyId = policy.policyId[policyIndex]
      await AttachRolePolicyAction({ cam, roleName, policyId })
    }
  } else {
    policyId = policy.roleName
    await AttachRolePolicyAction({ cam, roleName, policyId })
  }
  return utils.sleep(2000)
}

const DetachRolePolicyAction = async ({ cam, roleName, policyId }) => {
  const req = new camModels.DetachRolePolicyRequest()
  const body = {
    PolicyId: policyId,
    DetachRoleName: policyId
  }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.DetachRolePolicy.bind(cam))
  try {
    await handler(req)
  } catch (e) {
    throw e
  }
}

const removeRolePolicy = async ({ cam, policy }) => {
  const roleName = policy.roleName
  let policyId = null
  if (type(policy.policyId) === 'Array') {
    for (let policyIndex = 0; policyIndex < policy.policyId.length; policyIndex++) {
      policyId = policy.policyId[policyIndex]
      await DetachRolePolicyAction({ cam, roleName, policyId })
    }
  } else {
    policyId = policy.roleName
    await DetachRolePolicyAction({ cam, roleName, policyId })
  }
}

const createRole = async ({ cam, service, policy }) => {
  const PolicyDocument = {
    version: '2.0',
    statement: [
      {
        effect: 'allow',
        principal: {
          service: service
        },
        action: 'sts:AssumeRole'
      }
    ]
  }
  const req = new camModels.CreateRoleRequest()
  const body = {
    RoleName: policy.roleName,
    PolicyDocument: JSON.stringify(PolicyDocument)
  }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.CreateRole.bind(cam))
  try {
    const result = await handler(req)
    await addRolePolicy({ cam, policy })
    return result.RoleId
  } catch (e) {
    throw e
  }
}

const deleteRole = async ({ cam, policy }) => {
  await removeRolePolicy({ cam, policy })
  const req = new camModels.DeleteRoleRequest()
  const body = { RoleName: policy.roleName }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.DeleteRole.bind(cam))
  try {
    await handler(req)
  } catch (e) {
    throw e
  }
}

const getRole = async ({ cam, policy }) => {
  const req = new camModels.GetRoleRequest()
  const body = { RoleName: policy.roleName }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.GetRole.bind(cam))
  try {
    const result = await handler(req)
    return {
      roleName: result.RoleInfo.RoleName,
      roleId: result.RoleInfo.RoleId,
      service: JSON.parse(decodeURIComponent(result.RoleInfo.PolicyDocument)).statement[0].principal
        .service
    }
  } catch (e) {
    if (e.message.includes('role not exist')) {
      return null
    }
    throw e
  }
}

const updateAssumeRolePolicy = async ({ cam, service, policy }) => {
  const PolicyDocument = {
    version: '2.0',
    statement: [
      {
        effect: 'allow',
        principal: {
          service: service
        },
        action: 'sts:AssumeRole'
      }
    ]
  }
  const req = new camModels.UpdateAssumeRolePolicyRequest()
  const body = {
    RoleName: policy.roleName,
    PolicyDocument: JSON.stringify(PolicyDocument)
  }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.UpdateAssumeRolePolicy.bind(cam))
  try {
    await handler(req)
  } catch (e) {
    throw e
  }
}

const inputsChanged = (prevRole, role) => {
  // todo policyId
  const inputsService = pick(['service'], role)
  const prevInputsService = pick(['service'], prevRole)

  if (type(inputsService.service) === 'Array') {
    inputsService.service.sort()
  }
  if (type(prevInputsService.service) === 'Array') {
    prevInputsService.service.sort()
  }

  return not(equals(inputsService, prevInputsService))
}

module.exports = {
  createRole,
  deleteRole,
  getRole,
  addRolePolicy,
  removeRolePolicy,
  updateAssumeRolePolicy,
  inputsChanged
}
