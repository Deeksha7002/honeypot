import type { Scenario } from './types';

const SCENARIOS: Scenario[] = [
    {
        id: "scam_crypto_01",
        type: "scam",
        source: 'email',
        senderName: "CoinBase Support",
        location: "Eastern Europe",
        messages: [
            "Hello, your account has been compromised.",
            "Please click here to verify your wallet: http://bit.ly/fake-crypto-link",
            "We need your private key to restore funds."
        ]
    },
    {
        id: "scam_job_01",
        type: "scam",
        source: 'sms',
        senderName: "HR Dept",
        location: "South East Asia",
        messages: [
            "Hi! Earn $500/day working from home.",
            "Fill this: www.scam-job-site.com/apply",
            "Limited spots!"
        ]
    },
    {
        id: "benign_mom_01",
        type: "benign",
        source: 'sms',
        senderName: "Mom",
        location: "USA",
        messages: [
            "Are you coming for dinner?",
            "Dad made lasagna."
        ]
    },
    {
        id: "benign_work_01",
        type: "benign",
        source: 'chat',
        senderName: "Sarah (Work)",
        location: "USA",
        messages: [
            "Can you send me the Q3 report?",
            "Thanks!"
        ]
    },
    {
        id: "scam_slow_burn_01",
        type: "scam",
        source: 'chat',
        senderName: "Unknown User",
        location: "West Africa",
        messages: [
            "Hi",
            "How are you doing today?",
            "I'm sorry to bother you, but I have a business proposal.",
            "My company is looking for partners. You can keep 10%.",
            "Do you have a bank account for international transfers?"
        ]
    },
    {
        id: "scam_irs_authority",
        type: "scam",
        source: 'sms',
        senderName: "IRS-ALERT",
        location: "South America",
        messages: [
            "FINAL NOTICE: You have unpaid taxes of $4,500.",
            "A warrant has been issued for your arrest.",
            "Call this number immediately or visit www.irs-payment-portal-secure.com to avoid jail time."
        ]
    },
    {
        id: "scam_tech_support",
        type: "scam",
        source: 'chat',
        senderName: "Microsoft Support",
        location: "South Asia",
        messages: [
            "We have detected a virus on your Windows computer.",
            "Your IP address is being used for illegal activities.",
            "Please download our secure remote tool to fix: www.quick-assist-win.net"
        ]
    },
    {
        id: "scam_family_compromise_01",
        type: "scam",
        source: 'sms',
        senderName: "Dad",
        relationalContext: 'family',
        location: "USA",
        messages: [
            "Hey son, I'm in a bit of a jam.",
            "I lost my wallet while traveling.",
            "Can you send me a $500 gift card just so I can get a taxi home?",
            "I'll pay you back immediately."
        ]
    },
    {
        id: "scam_work_compromise_01",
        type: "scam",
        source: 'chat',
        senderName: "Sarah (Work)",
        relationalContext: 'work',
        location: "USA",
        messages: [
            "Hi, did you see the urgent invoice I just uploaded?",
            "I need you to approve it ASAP or we miss the vendor deadline.",
            "View it here: sharepoint-internal-secure.com/auth-login"
        ]
    },
    {
        id: "scam_deepfake_voice",
        type: "scam",
        source: 'sms',
        senderName: "Bank Fraud Dept",
        location: "Unknown",
        messages: [
            "Urgent: suspicious activity on your account. Listen to this recording of the transaction authorization.",
            "If this was not you, press 1 immediately."
        ],
        attachments: [
            { type: 'AUDIO', url: '#', name: 'auth_recording_fake.mp3' }
        ]
    },
    {
        id: "scam_ai_profile",
        type: "scam",
        source: 'chat',
        senderName: "Investment Guru",
        location: "Cyprus",
        messages: [
            "Look at my success profile. I can help you triple your portfolio in 2 days.",
            "Verify my identity with this photo."
        ],
        attachments: [
            { type: 'IMAGE', url: '#', name: 'guru_identity_ai.jpg' }
        ]
    },
    {
        id: "benign_media_01",
        type: "benign",
        source: 'chat',
        senderName: "Sarah (Work)",
        location: "USA",
        messages: [
            "Here is the walkthrough for the new feature.",
            "Let me know if it works!"
        ],
        attachments: [
            { type: 'VIDEO', url: '#', name: 'walkthrough_v1.mp4' }
        ]
    }
];

export class MockScammerAPI {
    // We now might track multiple active threads if we wanted complex simulation,
    // but for the demo we will just generate "New Threads" on demand.
    // The App.tsx will manage the list of threads.

    // Helper to get random scenario
    getRandomScenario(): Scenario {
        return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    }

    getScenario(id: string): Scenario | undefined {
        return SCENARIOS.find(s => s.id === id);
    }

    // Generic fallbacks to keep the conversation going indefinitely
    private GENERIC_FALLBACKS = [
        "Are you there?",
        "Please respond immediately.",
        "I am waiting for the details.",
        "Why are you wasting my time?",
        "Hello?",
        "Do you want the money or not?",
        "Please follow the instructions above.",
        "Are you playing games with me?",
        "Send the code now.",
        "I need you to verify this ASAP.",
        "Don't be stupid, just do it.",
        "Sir?",
        "Madam?",
        "I'm very busy, please hurry."
    ];

    // Helper to simulate a reply for a specific thread context
    getReplyForScenario(scenarioId: string, step: number): Promise<string | null> {
        const scenario = SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) return Promise.resolve(null);

        // If we still have scripted messages, return the next one
        if (step < scenario.messages.length) {
            return Promise.resolve(scenario.messages[step]);
        }

        // FALLBACK MODE: If script is done, keep nagging (Infinite Loop)
        // Return a random generic fallback message
        const randomFallback = this.GENERIC_FALLBACKS[Math.floor(Math.random() * this.GENERIC_FALLBACKS.length)];
        return Promise.resolve(randomFallback);
    }

    generateBatch(count: number): Scenario[] {
        const batch: Scenario[] = [];
        for (let i = 0; i < count; i++) {
            const template = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
            batch.push({
                ...template,
                id: `botnet-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                senderName: `Bot-${Math.floor(Math.random() * 9000) + 1000}`,
                location: this.getRandomLocation()
            });
        }
        return batch;
    }

    private getRandomLocation(): string {
        const locs = ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"];
        return locs[Math.floor(Math.random() * locs.length)];
    }
}
