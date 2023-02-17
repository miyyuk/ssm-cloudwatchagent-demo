# ssm-cloudwatchagent-demo

## 0. Prequisite

```
$ aws --version
aws-cli/2.4.27 Python/3.8.8
```

```
$ cdk --version
2.64.0
```

```
$ node -v
v16.18.1
```

```
$ npm -v
8.19.2
```

- Install Session Manager plugin for the AWS Cli
  - https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

## 1. How to run cdk locally

- Copy `.env.local` to `.env`
- Add variable in `.env`
- Set your profile in your local env
- Run `npm install`

### Bootstrap (First time only)
Please run this command first to bootstrap. Only one time is enough.


```
cdk bootstrap --profile {your profile}
```

### Diff
Please use this command if you want to check the differences of resources after you update your CDK.

```
cdk diff --profile {your profile}
```

### Deploy
Please use this command if you want to deploy.

```
cdk deploy --profile {your profile}
```

### Destroy
Please use this command if you want to destroy all resourced created by CDK.

```
cdk destroy --profile {your profile}
```

## 2. How to accesss to EC2 (Manual operation)

### Get Windows login password
Since the keypair is stored in AWS Secrets Manager, please run the following command to get pem file.

```
aws secretsmanager get-secret-value \
--secret-id ec2-ssh-key/test-ec2-keypair/private \
--query SecretString \
--output text \
--profile {your profile} > cdk-key.pem && chmod 400 cdk-key.pem
```

**Get instance id**

```
aws ec2 describe-instances \
--filter "Name=key-name,Values=test-ec2-keypair" \
--profile {your profile}
```

**Get the Windows login password**

```
aws ec2 get-password-data \
--instance-id  {your instance id} \
--priv-launch-key <path-to-pem-file>\cdk-key.pem \
--profile {your profile}
```

### Start session

```
aws ssm start-session \
--target {your instance id} \
--document-name AWS-StartPortForwardingSession \
--parameters portNumber=3389,localPortNumber={your preferable port} \
--profile {your profile}
```

### Open remote desktop

- Open remote desktop app
- Enter `localhost:{your preferable port}`
- Input your password obtained by step `Get Windows login password`

## 3. How to install Cloudwatch agent to EC2 (Manual operation)

Open the Systems Manager console at https://console.aws.amazon.com/systems-manager/.

In the navigation pane, choose **Run Command**.

Set as follows. Other setting which are not mentioned in the following table is as default.

|Item| |Value|
|:----|:----|:----|
|Command document| |AWS-ConfigureAWSPackage|
|Command parameters|Action|Install|
| |Name|AmazonCloudWatchAgent|
| |Version|latest|
|Target selection|Target selection|Choose instances manually|
| |Name|{your instance id}|
|Output options|S3 bucket|Disable|
| |CloudWatch log|Disable|

Choose **Run**.

Ref: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance-fleet.html

## 4. How to install start Cloudwatch agent using SSM parameter store (Manual operation)

Open the Systems Manager console at https://console.aws.amazon.com/systems-manager/.

In the navigation pane, choose **Run Command**.

Set as follows.

|Item| |Value|
|:----|:----|:----|
|Command document| |AmazonCloudWatch-ManageAgent|
|Command parameters|Action|configure|
| |Mode|ec2|
| |Optional Configuration Source|ssm|
| |Optional Configuration Location|AmazonCloudWatch-test|
| |Optional Restart|yes|
|Target selection|Target selection|Choose instances manually|
| |Name|{your instance id}|
|Output options|S3 bucket|Disable|
| |CloudWatch log|Disable|

Choose **Run**.

Ref: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance-fleet.html

## 5. Verification

- Go to **CloudWatch** console
- Click **All metrics** in **Metrics** in left panel
- Click **CWAgent** in **Custom namespaces**
- Click **ImageId, InstanceId, InstanceType, instance, objectname** in Metrics
- Check the checkbox whose ...
  - **Instance name** is **your instance name** 
  - **instance** is **C:**
  - **objectname** is **LogicalDesk**
- You can see the graph showing the percentage of free space of C drive in the target instance.