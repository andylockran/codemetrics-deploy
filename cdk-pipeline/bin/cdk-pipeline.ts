#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkPipelineStack } from "../lib/cdk-pipeline-stack";

const app = new cdk.App();
new CdkPipelineStack(app, "CdkPipelineStack", {
  env: {
    account: "667872594302",
    region: "eu-west-2",
  },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

app.synth();
