import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as CdkPipeline from "../lib/cdk-pipeline-stack";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-pipeline-stack.ts
describe("Recursive pipeline", () => {
  const app = new cdk.App();
  const stack = new CdkPipeline.CdkPipelineStack(app, "TestStack");
  const template = Template.fromStack(stack);

  describe("A Github OIDC Provider is present", () => {
    test("The github OIDC provider is configured with the right url, ClientID and Thumbprints", () => {
      // https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
      const githubThumprints = [
        "6938fd4d98bab03faadb97b34396831e3780aea1",
        "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
      ];
      template.hasResourceProperties("Custom::AWSCDKOpenIdConnectProvider", {
        Url: "https://token.actions.githubusercontent.com",
        ClientIDList: Match.arrayEquals(["sts.amazonaws.com"]),
        ThumbprintList: Match.arrayEquals(githubThumprints),
      });
    });
  });
  describe("A Github Role is present", () => {
    test("It uses the OIDC provider, and the conditional role assumption correctly limited", () => {
      template.hasResourceProperties("AWS::IAM::Role", {
        AssumeRolePolicyDocument: Match.objectEquals({
          Statement: Match.arrayEquals([
            {
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringLike: {
                  "token.actions.githubusercontent.com:sub": Match.anyValue(),
                  "token.actions.githubusercontent.com:aud":
                    "sts.amazonaws.com",
                },
              },
              Effect: "Allow",
              Principal: {
                Federated: {
                  Ref: Match.anyValue(),
                },
              },
            },
          ]),
          Version: "2012-10-17"
        }),
      });
    });
  });
  describe("The deployments bucket is configured correctly", () => {
    test("It has public Read access disabled", () => {
      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: Match.objectEquals({
          "BlockPublicAcls": true,
          "BlockPublicPolicy": true,
          "IgnorePublicAcls": true,
          "RestrictPublicBuckets": true
        })
      });
    })
    test("It has versioning enabled", () => {
      template.hasResourceProperties("AWS::S3::Bucket", {
        VersioningConfiguration: Match.objectEquals({ "Status": "Enabled" })
      })
    })
  });
});
