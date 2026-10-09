const { spawn } = require('child_process');
const fs = require('fs');

async function waitAndDispatch() {
    console.log('Waiting for main Bus Information blast to finish...');
    while (true) {
        try {
            const logPath = 'sent_bus_notification_log.json';
            if (fs.existsSync(logPath)) {
                const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
                if (data.totalSent >= 6400) {
                    console.log(`Main blast nearing completion (${data.totalSent} sent). Starting Tanishka Day 2 dispatch!`);
                    break;
                }
            }
        } catch(e) {}
        await new Promise(r => setTimeout(r, 4000));
    }

    // Give a brief 5-second buffer for Resend connection pool
    await new Promise(r => setTimeout(r, 5000));

    console.log('🚀 Triggering send_tanishka_day2_invite.js --send...');
    const child = spawn('node', ['send_tanishka_day2_invite.js', '--send'], { stdio: 'inherit' });
    child.on('exit', (code) => {
        console.log('✓ Tanishka Day 2 blast finished with exit code', code);
    });
}

waitAndDispatch();
