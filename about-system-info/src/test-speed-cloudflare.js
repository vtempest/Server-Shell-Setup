import ora from 'ora';
import { spawn, execSync } from 'child_process';


/**
 * Tests the download speed in MB/s using Cloudflare's speed test.
 * Optionally displays a spinner message during the test.
 * Their official package is @cloudflare/speedtest and it shows errors and too much output.
 * This script uses a process to hide the errors and give speed in MB/s via CLI or import.
 * @param {boolean} [showMessage=true] - Whether to show explanation message while testing.
 * @returns {Promise<string>} The measured download speed in MB/s as a string (e.g., "12.3").
 *
 * @example
 * import { testDownloadSpeed } from './test-speed-cloudflare.js';
 * const downloadSpeed = await testDownloadSpeed(false);
 * console.log(downloadSpeed); // e.g., "12.3"
 */
export async function testDownloadSpeed(showMessage = true) {
  var spinner;
  if (showMessage) 
    spinner = ora('Testing download speed in MB/s using Cloudflare, runs for 1 minute').start();

  // globally install @cloudflare/speedtest
  await execSync('npm i -g @cloudflare/speedtest');

  const result = await new Promise((resolve) => {
    const child = spawn('node', [
      '-e',
      "import SpeedTest from '@cloudflare/speedtest'; new SpeedTest({iterations: 1}).onFinish = r => console.log((r.getDownloadBandwidth() / 8388608).toFixed(1))"
    ]);

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    // Extract last number from output
    child.on('close', () => {
      resolve(output.trim().split('\n').pop().match(/(\d+(\.\d+)?)/)?.[0]);
    });

  });

  if (showMessage) spinner.succeed(result + ' MB/s');
  return result;
}

// try{
// run if file is executed directly
// if (process?.env.npm_lifecycle_event?.length > 0 || import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1] || import.meta.url === `file://${process.cwd()}/${process.argv[1]}`) 
  testDownloadSpeed();
// } catch { }