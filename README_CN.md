# 腾讯云访问管理CAM-role组件

## 简介
该组件是serverless-tencent组件库中的基础组件之一。通过访问管理CAM-role组件，可以快速，方便的创建，配置和管理腾讯云的CAM角色

## 快速开始

通过CAM-role组件，对一个CAM的角色进行完整的创建，配置，部署和删除等操作。支持命令如下：

1. [安装](#1-安装)
2. [创建](#2-创建)
3. [配置](#3-配置)
4. [部署](#4-部署)

### 1. 安装

通过npm安装serverless

```console
$ npm install -g serverless
```

### 2. 创建

本地创建 `serverless.yml` 和 `.env` 两个文件

```console
$ touch serverless.yml
$ touch .env # 腾讯云的配置信息
```

在 `.env` 文件中配置腾讯云的APPID，SecretId和SecretKey信息并保存

如果没有腾讯云账号，可以在此[注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在[API密钥管理
](https://console.cloud.tencent.com/cam/capi)中获取`APPID`, `SecretId` 和`SecretKey`.

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
TENCENT_APP_ID=123
```

### 3. 配置

在serverless.yml中进行如下配置

```yml
# serverless.yml

myFunction1:
  component: "@serverless/tencent-cam-role"
  inputs:
    roleName: QCS_SCFExcuteRole
    # description: test # Optional
    service:
      - scf.qcloud.com
      - cos.qcloud.com
    policy:
      # policyId:  # PolicyId and policyName must exist at least one
        # - 1
        # - 2
      policyName:
        - QCloudResourceFullAccess
        - QcloudAccessForCDNRole
 ```
 
 * 该组件关联了policyId和policyName之间的联系，填写任一信息都可以识别
 
### 4. 部署

通过如下命令进行部署，并查看部署过程中的信息
```console
$ serverless --debug
```

### 测试案例
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

### 还支持哪些组件？

可以在 [Serverless Components](https://github.com/serverless/components) repo 中查询更多组件的信息。

