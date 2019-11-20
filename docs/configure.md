# Configure document

## Complete configuration

```yml
# serverless.yml

myRole:
  component: "@tencent-serverless/tencent-cam-role-beta"
  inputs:
    roleName: QCS_SCFExcuteRole
    description: test
    service:
      - scf.qcloud.com
      - cos.qcloud.com
    policy:
      policyId:
        - 1
        - 2
      policyName:
        - QCloudResourceFullAccess
        - QcloudAccessForCDNRole
         
```

## Configuration description

Main param description

| Param        | Required/Optional    |    Description |
| --------     | :-----:              |   :----      |
| roleName       | Required          | Role name|
| description | Optional             | Role description |
| service  | Required                | Service list |
| [policy](#policy-param-description)| Required             | Policy information |


### policy param description

| Param        | Required/Optional    |  Description |
| --------     | :-----:              |  :----      |
| policyId     | Optional             | Policy Id |
| policyName   | Optional             | Policy name |

* PolicyId and policyName must exist at least one
