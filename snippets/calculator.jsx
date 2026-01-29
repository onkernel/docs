import { useState, useEffect, useRef } from 'react';
import { Card, Columns } from '@mintlify/components';

export const PricingCalculator = () => {
    const [plan, setPlan] = useState('free');
    const [headless, setHeadless] = useState(true);
    const [avgSessionLength, setAvgSessionLength] = useState(30);
    const [numSessions, setNumSessions] = useState(100);
    const [flash, setFlash] = useState(false);
    const prevPriceRef = useRef(null);

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
    useEffect(() => {
        const prev = prevPriceRef.current;
        if (prev !== null && (prev.usageCost !== usageCost || prev.includedUsageCredits !== includedUsageCredits || prev.price !== price)) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 150);
            return () => clearTimeout(t);
        }
        prevPriceRef.current = { usageCost, includedUsageCredits, price };
    }, [usageCost, includedUsageCredits, price]);
    const labelStyle = { fontWeight: 600, fontSize: '0.875rem', color: '#374151', minWidth: '10rem', flexShrink: 0 };
    const rowStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.25rem' };
    const inputStyle = { minWidth: 0, flex: 1, maxWidth: '100%', boxSizing: 'border-box' };
    return (
        <Columns cols={2}>
            <Card title="Controls" icon="calculator">
                <div style={rowStyle}>
                    <label style={labelStyle}>Plan</label>
                    <select style={inputStyle} value={plan} onChange={(e) => setPlan(e.target.value)}>
                        <option value="free">Free</option>
                        <option value="hobbyist">Hobbyist</option>
                        <option value="startup">Startup</option>
                    </select>
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>Average session length</label>
                    <input type="number" style={inputStyle} value={avgSessionLength} onChange={(e) => setAvgSessionLength(parseInt(e.target.value))} />
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>Number of sessions</label>
                    <input type="number" style={inputStyle} value={numSessions} onChange={(e) => setNumSessions(parseInt(e.target.value))} />
                </div>
                <div style={rowStyle}>
                    <button class="btn btn-primary" style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${!headless ? '#7c3aed' : '#000'}`, fontSize: '0.875rem', background: !headless ? '#e9d5ff' : undefined }} onClick={() => setHeadless(false)}>Headful</button>
                    <button class="btn btn-primary" style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${headless ? '#7c3aed' : '#000'}`, fontSize: '0.875rem', background: headless ? '#e9d5ff' : undefined }} onClick={() => setHeadless(true)}>Headless</button>
                </div>
            </Card>
            <Card title="Price" icon="circle-dollar">
                <div><span style={labelStyle}>Usage cost:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease' }}>${usageCost.toFixed(6)}</span></div>
                <div><span style={labelStyle}>Included usage credits:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease' }}>${includedUsageCredits.toFixed(6)}</span></div>
                <div><span style={labelStyle}>Price:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease' }}>${price.toFixed(2)}</span></div>
            </Card>
        </Columns>
    );
};