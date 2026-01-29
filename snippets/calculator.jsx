export const PricingCalculator = () => {
    const [price, setPrice] = useState(0);
    const [plan, setPlan] = useState('free');
    const [headless, setHeadless] = useState(true);
    const [avgSessionLength, setAvgSessionLength] = useState(30);
    const [numSessions, setNumSessions] = useState(100);

    const calculatePrice = () => {
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
        if (plan === 'free') {
            if (usageCost > 5) {
                price += usageCost - 5;
            }
        } else if (plan === 'hobbyist' && price < 30) {
            if (usageCost > 10) {
                price += usageCost - 10;
            }
        } else if (plan === 'startup') {
            if (usageCost > 50) {
                price += usageCost - 50;
            }
        }
        setPrice(price);
    };
  return (
    <div>
      <select value={plan} onChange={(e) => setPlan(e.target.value)}>
        <option value="free">Free</option>
        <option value="hobbyist">Hobbyist</option>
        <option value="startup">Startup</option>
      </select>
      <select value={headless} onChange={(e) => setHeadless(e.target.value == 'true')}>
        <option value="true">Headless</option>
        <option value="false">Headful</option>
      </select>
      <input type="number" value={avgSessionLength} onChange={(e) => setAvgSessionLength(e.target.value)} />
      <input type="number" value={numSessions} onChange={(e) => setNumSessions(e.target.value)} />
      <button onClick={calculatePrice}>Calculate</button>
      <p>Price: {price}</p>
    </div>
  );
};