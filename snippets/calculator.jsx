export const PricingCalculator = () => {
    const [plan, setPlan] = useState('free');
    const [headless, setHeadless] = useState(true);
    const [avgSessionLength, setAvgSessionLength] = useState(30);
    const [numSessions, setNumSessions] = useState(100);

    console.log('re-render');

    let price = 0;
    if (plan === 'free') {
        price = 0;
    } else if (plan === 'hobbyist') {
        price = 30;
    }
    if (plan === 'startup') {
        price = 200;
    }
    let usageCost = 0
    if (headless) {
        usageCost += 0.0000166667 * 1 * numSessions * avgSessionLength;
    } else {
        usageCost += 0.0000166667 * 8 * numSessions * avgSessionLength;
    }

    let includedUsageCredits = 5;
    if (plan === 'hobbyist') {
        includedUsageCredits = 10;
    } else if (plan === 'startup') {
        includedUsageCredits = 50;
    }
    if (usageCost > includedUsageCredits) {
        price += usageCost - includedUsageCredits;
    }
    return (
        <div>
            <div>
                <label>Plan</label>
                <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                    <option value="free">Free</option>
                    <option value="hobbyist">Hobbyist</option>
                    <option value="startup">Startup</option>
                </select>
            </div>
            <div>
                <label>Headless</label>
                <select value={headless} onChange={(e) => setHeadless(e.target.value == 'true')}>
                    <option value="true">Headless</option>
                    <option value="false">Headful</option>
                </select>
            </div>
            <div>
                <label>Average session length</label>
                <input type="number" value={avgSessionLength} onChange={(e) => setAvgSessionLength(parseInt(e.target.value))} />
            </div>
            <div>
                <label>Number of sessions</label>
                <input type="number" value={numSessions} onChange={(e) => setNumSessions(parseInt(e.target.value))} />
            </div>
            <div>Usage cost: ${usageCost.toFixed(6)}</div>
            <div>Included usage credits: ${includedUsageCredits.toFixed(6)}</div>
            <div>Price: ${price.toFixed(2)}</div>
        </div>
    );
};