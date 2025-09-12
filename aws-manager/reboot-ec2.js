#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { EC2 } from '@aws-sdk/client-ec2';

// CLI setup with Commander
const program = new Command();
program
  .name('ec2-rebooter')
  .description('Reboot an EC2 instance with progress and colorized output')
  .version('1.0.0')
  .option('-i, --instance <id>', 'EC2 Instance ID', process.env.EC2_INSTANCE_ID)
  .option('-r, --region <region>', 'AWS Region', process.env.EC2_REGION)
  .parse(process.argv);

const options = program.opts();

const credentials = {
    region: options.region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

const EC2_INSTANCE_ID = options.instance;
const ec2 = new EC2(credentials);

const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const SYMBOLS = {
    success: chalk.green('✔'),
    error: chalk.red('✖'),
    info: chalk.blue('ℹ'),
    warn: chalk.yellow('⚠')
};

function renderProgressBar(percent) {
    const barLength = 30;
    const filledLength = Math.round(barLength * percent);
    const bar = chalk.green('█').repeat(filledLength) + chalk.gray('-').repeat(barLength - filledLength);
    return `[${bar}] ${chalk.bold(`${(percent * 100).toFixed(0)}%`)}`;
}

async function getInstanceStatus(instanceId) {
    const params = {
        InstanceIds: [instanceId],
        IncludeAllInstances: true
    };
    const response = await ec2.describeInstanceStatus(params);
    return response.InstanceStatuses[0]?.InstanceState?.Name || 'unknown';
}

async function rebootEC2(instanceId) {
    try {
        process.stdout.write(`${SYMBOLS.info} ${chalk.cyan('Stopping EC2 instance')} ${chalk.yellow(instanceId)}...\n`);
        await ec2.stopInstances({ InstanceIds: [instanceId] });

        const maxSeconds = 120;
        let spinnerIndex = 0;

        for (let i = 0; i < maxSeconds; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const status = await getInstanceStatus(instanceId);

            const percent = (i + 1) / maxSeconds;
            const spinner = chalk.magenta(SPINNER_FRAMES[spinnerIndex % SPINNER_FRAMES.length]);
            spinnerIndex++;

            process.stdout.write(
                `\r${spinner} ${chalk.cyan('Waiting for stop/start...')} ${renderProgressBar(percent)} Status: ${chalk.bold(status)}   `
            );

            if (status === 'stopped') {
                process.stdout.write(`\n${SYMBOLS.info} ${chalk.cyan('Starting EC2 instance')} ${chalk.yellow(instanceId)}...\n`);
                await ec2.startInstances({ InstanceIds: [instanceId] });
            }

            if (status === 'running') {
                process.stdout.write(`\n${SYMBOLS.success} ${chalk.green('SUCCESS: Instance is running!')}\n`);
                return;
            }
        }
        process.stdout.write(`\n${SYMBOLS.warn} ${chalk.yellow('Timeout reached while waiting for instance to start')}\n`);
    } catch (error) {
        process.stdout.write('\n');
        console.error(`${SYMBOLS.error} ${chalk.red('Error during reboot process:')}`, error);
        throw error;
    }
}

rebootEC2(EC2_INSTANCE_ID)
    .then(() => {
        console.log(`${SYMBOLS.success} ${chalk.green('Reboot process completed')}`);
        process.exit(0);
    })
    .catch(error => {
        console.error(`${SYMBOLS.error} ${chalk.red('Failed to reboot instance:')}`, error);
        process.exit(1);
    });
