# Tencent-cam-role-component

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
$ touch .env      # your Tencent api keys
```

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

### 3. Configure

```yml
# serverless.yml

myRole:
  component: "@serverless/tencent-cam-role-component"
  inputs:
    service: scf.qcloud.com
    policy:
      roleName: QCS_SCFExcuteRole
      policyId: 1
```

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### Test
```text
DFOUNDERLIU-MB0:tencent-cos-component-master dfounderliu$ sls 

  name:    z57nkg-5ogwwirn
  roleId:  *********
  service: 
    - scf.qcloud.com
  policy: 
    roleName: QCS_SCFExcuteRole
    policyId: 
      - 534122
      - 534803
      - 1

  3s › TencentCamRole › done
  
DFOUNDERLIU-MB0:tencent-cos-component-master dfounderliu$ sls remove

  name:    z57nkg-5ogwwirn
  roleId:  ********
  service: 
    - scf.qcloud.com
  policy: 
    roleName: QCS_SCFExcuteRole
    policyId: 
      - 534122
      - 534803
      - 1

  0s › TencentCamRole › done

```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
