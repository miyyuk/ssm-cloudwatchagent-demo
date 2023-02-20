import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as keypair from 'cdk-ec2-key-pair'
import * as ssm from 'aws-cdk-lib/aws-ssm'

import { type Construct } from 'constructs'

export class ApplicationStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create VPC, 1 public subnet, 1 private subnet, Internet gateway, NAT gateway and Route table in 1 availability zone.
    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 1,
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      ]
    })

    // Key pair for EC2
    const key = new keypair.KeyPair(this, 'KeyPair', {
      name: 'test-ec2-keypair',
      description: 'Key Pair for EC2'
    })
    // Grant read access for the key
    key.grantReadOnPublicKey

    // Security group for EC2
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Default',
      allowAllOutbound: true
    })

    // IAM role for EC2
    const role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    })
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'))

    // EC2
    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: new ec2.WindowsImage(ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE),
      securityGroup,
      keyName: key.keyPairName,
      role
    })

    // Value for SSM Parameter store
    const ssmParam = {
      metrics: {
        aggregation_dimensions: [
          [
            'InstanceId'
          ]
        ],
        append_dimensions: {
          AutoScalingGroupName: '${aws:AutoScalingGroupName}',
          ImageId: '${aws:ImageId}',
          InstanceId: '${aws:InstanceId}',
          InstanceType: '${aws:InstanceType}'
        },
        metrics_collected: {
          LogicalDisk: {
            measurement: [
              '% Free Space'
            ],
            metrics_collection_interval: 60,
            resources: [
              '*'
            ]
          }
        }
      }
    }
    // SSM - Parameter store
    const ssmParamStore = new ssm.StringParameter(this, 'Param', {
      parameterName: 'AmazonCloudWatch-test',
      stringValue: JSON.stringify(ssmParam)
    })

    // Output
    // Used to get Windows login password by this
    new cdk.CfnOutput(this, 'Download Key Command', {
      value: 'aws secretsmanager get-secret-value --secret-id ec2-ssh-key/test-ec2-keypair/private --query SecretString --output text --profile {your profile} > cdk-key.pem && chmod 400 cdk-key.pem'
    })
  }
}
