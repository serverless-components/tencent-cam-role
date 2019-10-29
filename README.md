# Tencent-cam-role

Easily provision Tencent CAM roles using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;


### 1. Install

```shell
$ npm install -g serverless
```

### 2. Create

Just create a `serverless.yml` file

```shell
$ touch serverless.yml
$ touch .env      # configure your Tencent api keys
```
If you don't have a Tencent Cloud account, you could [sign up](https://intl.cloud.tencent.com/register) first.  

If you already login in, find  `TENCENT_SECRET_ID` and `TENCENT_SECRET_KEY`  in [Tencent Console](https://console.cloud.tencent.com/cam/capi).

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

### 3. Configure

```yml
# serverless.yml

myFunction1:
  component: "./tencent-cam-role"
  inputs:
    service:
      - scf.qcloud.com
      - cos.qcloud.com
    policy:
      roleName: QCS_SCFExcuteRole
      # description: test # Optional
      # policyId:  # PolicyId and policyName must exist at least one
        # - 1
        # - 2
      policyName:
        - QCloudResourceFullAccess
        - QcloudAccessForCDNRole
 ```
 
 * The binding between policyName and policyId is bound.

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### Test
```text
DFOUNDERLIU-MB0:temp dfounderliu$ sls

  myFunction1: 
    name:    w9pe3ej-jzy0lsg
    roleId:  4611686018427945536
    service: 
      - scf.qcloud.com
      - cos.qcloud.com
    policy: 
      roleName:   QCS_SCFExcuteRole
      policyId: 
        - 1
        - 2
        - 16313162
      policyName: 
        - AdministratorAccess
        - QCloudResourceFullAccess
        - QcloudAccessForCDNRole

  8s › myFunction1 › done

DFOUNDERLIU-MB0:temp dfounderliu$ sls remove

  2s › myFunction1 › done


```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
