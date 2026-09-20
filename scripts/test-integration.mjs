import {spawn} from 'node:child_process'
const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run','tests/analysis-runtime.test.ts'],{stdio:'inherit',env:{...process.env,PRINTEMPS_INTEGRATION:'1'}})
child.on('error',error=>{console.error(error);process.exitCode=1})
child.on('close',code=>{process.exitCode=code??1})
