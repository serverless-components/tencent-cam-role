const { utils } = require('@serverless/core')
const util = require('util')
const { equals, pick, type } = require('ramda')
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
    throw 'AttachRolePolicyActionError: ' + e
  }
}

const addRolePolicy = async ({ cam, policy }) => {
  const roleName = policy.roleName
  let policyId = null
  /*
		policyId could be one policy or many policies
		if policy.policyId is array:
			Loop AttachRolePolicyAction
		else:
			AttachRolePolicyAction
	 */
  if (type(policy.policyId) === 'Array') {
    for (let policyIndex = 0; policyIndex < policy.policyId.length; policyIndex++) {
      await utils.sleep(1000) // Prevent overclocking
      policyId = policy.policyId[policyIndex]
      await AttachRolePolicyAction({ cam, roleName, policyId })
    }
  } else {
    policyId = policy.policyId
    await AttachRolePolicyAction({ cam, roleName, policyId })
  }
}

const DetachRolePolicyAction = async ({ cam, roleName, policyId }) => {
  const req = new camModels.DetachRolePolicyRequest()
  const body = {
    PolicyId: policyId,
    DetachRoleName: roleName
  }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.DetachRolePolicy.bind(cam))
  try {
    await handler(req)
  } catch (e) {
    throw 'DetachRolePolicyActionError: ' + e
  }
}

const removeRolePolicy = async ({ cam, policyList, policy }) => {
  const roleName = policy.roleName
  let policyId = null
  /*
		policyId could be one policy or many policies
		if policy.policyId is array:
			Loop AttachRolePolicyAction
		else:
			AttachRolePolicyAction
	 */
  if (type(policy.policyId) === 'Array') {
    for (let policyIndex = 0; policyIndex < policyList.length; policyIndex++) {
      await utils.sleep(1000) // Prevent overclocking
      policyId = policyList[policyIndex]
      await DetachRolePolicyAction({ cam, roleName, policyId })
    }
  } else {
    policyId = policy.policyId
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
    PolicyDocument: JSON.stringify(PolicyDocument),
    Description: policy.description
  }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.CreateRole.bind(cam))
  try {
    const result = await handler(req)
    await addRolePolicy({ cam, policy })
    return result.RoleId
  } catch (e) {
    throw 'CreateRoleError: ' + e
  }
}

const deleteRole = async ({ cam, policy }) => {
  const req = new camModels.DeleteRoleRequest()
  const body = { RoleName: policy.roleName }
  req.from_json_string(JSON.stringify(body))
  const handler = util.promisify(cam.DeleteRole.bind(cam))
  try {
    await handler(req)
  } catch (e) {
    throw 'DeleteRoleError: ' + e
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
    throw 'GetRoleError: ' + e
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
    throw 'UpdateAssumeRolePolicyError: ' + e
  }
}

const inputsChanged = async (cam, prevRole, role) => {
  const req = new camModels.ListAttachedRolePoliciesRequest()
  let pagePolicyCount = 1
  let page = 1
  let pagePolicyList
  const policyIdList = new Array()
  let body
  while (pagePolicyCount > 0) {
    await utils.sleep(500) // Prevent overclocking
    body = {
      RoleId: prevRole.roleId,
      Page: page,
      Rp: 200
    }
    req.from_json_string(JSON.stringify(body))
    const handler = util.promisify(cam.ListAttachedRolePolicies.bind(cam))
    try {
      pagePolicyList = await handler(req)
      pagePolicyCount = pagePolicyList.List.length
      for (let i = 0; i < pagePolicyList.List.length; i++) {
        policyIdList.push(pagePolicyList.List[i].PolicyId)
      }
    } catch (e) {
      if (e.message.includes('role not exist')) {
        return null
      }
      throw 'InputsChangedEError: ' + e
    }
    page = page + 1
  }

  policyIdList.sort()
  let rolePolicyId = new Array()
  if (type(role.policy.policyId) === 'Array') {
    role.policy.policyId.sort()
    rolePolicyId = role.policy.policyId
  } else {
    rolePolicyId.push(role.policy.policyId)
  }

  const inputsService = pick(['service'], role)
  const prevInputsService = pick(['service'], prevRole)
  if (type(inputsService.service) === 'Array') {
    inputsService.service.sort()
  }
  if (type(prevInputsService.service) === 'Array') {
    prevInputsService.service.sort()
  }

  return {
    service: !equals(inputsService, prevInputsService),
    policy: !equals(policyIdList, rolePolicyId),
    policyList: policyIdList
  }
}

const fullPolicyId = async (cam, inputs) => {
  /*
		Take the union of policyid and policyname
		Inputs:
			{
				service: [ 'scf.qcloud.com', 'cos.qcloud.com' ],
				policy: {
					roleName: 'QCS_SCFExcuteRole',
					policyId: [ 1, 2, 3 ],
					policyName: [ 'QcloudAccessForCDNRole' ]
				},
				region: 'ap-guangzhou'
			}
	 */
  const req = new camModels.ListPoliciesRequest()
  let body
  let handler
  let page = 1
  let pagePolicList
  let pagePolicyCount = 1
  const policyIdList = new Array()
  const policyNameList = new Array()

  if (!(type(inputs.policy.policyId) === 'Array')) {
    const tempPolicyIdArray = new Array()
    tempPolicyIdArray.push(inputs.policy.policyId)
    inputs.policy.policyId = tempPolicyIdArray
  }
  if (!(type(inputs.policy.policyName) === 'Array')) {
    const tempPolicyNameArray = new Array()
    tempPolicyNameArray.push(inputs.policy.policyName)
    inputs.policy.policyName = tempPolicyNameArray
  }

  // cam could not get policyId through policyName, has not this type api
  // so use ListPolicies api to get  policy list
  while (pagePolicyCount > 0) {
    await utils.sleep(500) // Prevent overclocking
    body = {
      Rp: 200,
      Page: page
    }
    req.from_json_string(JSON.stringify(body))
    handler = util.promisify(cam.ListPolicies.bind(cam))
    try {
      // todo reduce complexity
      pagePolicList = await handler(req)
      pagePolicyCount = pagePolicList.List.length
      for (let j = 0; j < pagePolicList.List.length; j++) {
        for (let i = 0; i < inputs.policy.policyId.length; i++) {
          if (pagePolicList.List[j].PolicyId == inputs.policy.policyId[i]) {
            // Skip if policyid already exists
            if (policyIdList.indexOf(pagePolicList.List[j].PolicyId) == -1) {
              policyIdList.push(pagePolicList.List[j].PolicyId)
              policyNameList.push(pagePolicList.List[j].PolicyName)
            }
          }
        }
        for (let i = 0; i < inputs.policy.policyName.length; i++) {
          if (pagePolicList.List[j].PolicyName == inputs.policy.policyName[i]) {
            // Skip if policyid already exists
            if (policyIdList.indexOf(pagePolicList.List[j].PolicyId) == -1) {
              policyIdList.push(pagePolicList.List[j].PolicyId)
              policyNameList.push(pagePolicList.List[j].PolicyName)
            }
          }
        }
      }
    } catch (e) {
      throw 'GetPolicyIdListError: ' + e
    }
    page = page + 1
  }
  inputs.policy.policyName = policyNameList
  inputs.policy.policyId = policyIdList
  return inputs
}

module.exports = {
  createRole,
  deleteRole,
  getRole,
  addRolePolicy,
  removeRolePolicy,
  updateAssumeRolePolicy,
  inputsChanged,
  fullPolicyId
}
