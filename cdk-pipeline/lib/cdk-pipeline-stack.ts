import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import {
  Bucket
} from "aws-cdk-lib/aws-s3"
import {
  WebIdentityPrincipal,
  OpenIdConnectProvider,
  Role,
  PolicyStatement,
  PolicyDocument,
  Effect,
} from "aws-cdk-lib/aws-iam";

export class CdkPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOIDCprovider = new OpenIdConnectProvider(this, "GithubOIDC", {
      // https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: [
        "6938fd4d98bab03faadb97b34396831e3780aea1",
        "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
      ],
    });

    const deploymentBucket = new Bucket(this, "DeploymentArtifacts", {
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const githubActionsDeploymentRole = new Role(
      this,
      `GithubActionsDeploymentUser`,
      {
        assumedBy: new WebIdentityPrincipal(
          githubOIDCprovider.openIdConnectProviderArn,
          {
            StringLike: {
              "token.actions.githubusercontent.com:sub": "repo:andylockran/*",
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            },
          }
        ),
        roleName: "github-actions-deployment-role",
        inlinePolicies: {
          "github-actions-deployment-policy": new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  "s3:List*",
                  "s3:Put*"
                ],
                resources: [
                  deploymentBucket.bucketArn,
                  `${deploymentBucket.bucketArn}/*`
                ],
              }),
            ],
          }),
        },
      }
    );

    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: "CDKPipeline",
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.s3(deploymentBucket, 'codemetrics-deploy.zip'),
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
    });
  }
}
