import { useState, useEffect, useRef } from 'react';
import { Card, Columns } from '@mintlify/components';

export const PricingCalculator = () => {
    const planPrices = {
        free: 0,
        hobbyist: 30,
        startup: 200,
    }
    const usagePrices = 0.0000166667

    const [plan, setPlan] = useState('free');
    const [headless, setHeadless] = useState(true);
    const [avgSessionLength, setAvgSessionLength] = useState(30);
    const [numSessions, setNumSessions] = useState(100);
    const [flash, setFlash] = useState(false);
    const getIsDarkMode = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const prevPriceRef = useRef(null);
    useEffect(() => {
        setIsDarkMode(getIsDarkMode());
        const observer = new MutationObserver(() => setIsDarkMode(getIsDarkMode()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const m = window.matchMedia('(prefers-color-scheme: dark)');
        const onSchemeChange = () => setIsDarkMode(getIsDarkMode());
        m.addEventListener('change', onSchemeChange);
        return () => {
            observer.disconnect();
            m.removeEventListener('change', onSchemeChange);
        };
    }, []);

    let price = planPrices[plan];
    let usageCost = 0
    if (headless) {
        usageCost += usagePrices * 1 * numSessions * avgSessionLength;
    } else {
        usageCost += usagePrices * 8 * numSessions * avgSessionLength;
    }

    let includedUsageCredits = 5;
    if (plan === 'hobbyist') {
        includedUsageCredits = 10;
    } else if (plan === 'startup') {
        includedUsageCredits = 50;
    }
    if (usageCost > includedUsageCredits) {
        price += Math.max(0, usageCost - includedUsageCredits);
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
    const labelStyle = { fontWeight: 600, fontSize: '0.875rem', minWidth: '10rem', flexShrink: 0, maxWidth: '10rem' };
    const rowStyle = { display: 'flex', alignItems: 'center', gap: '0.5rem', minHeight: '2.25rem' };
    const inputStyle = { minWidth: 0, flex: 1, maxWidth: '100%', boxSizing: 'border-box' };
    const numberInputStyle = {
        borderBottom: '1px solid #7c3aed', textAlign: 'right'
    };
    const selectStyle = {
        ...inputStyle,
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23374151'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '0.75rem',
        paddingRight: '1.5rem',
    };
    return (
        <Columns cols={2}>
            <Card title="Controls" icon="calculator">
                <div style={rowStyle}>
                    <label style={labelStyle}>Plan</label>
                    <select style={selectStyle} value={plan} onChange={(e) => setPlan(e.target.value)}>
                        <option value="free">Free</option>
                        <option value="hobbyist">Hobbyist</option>
                        <option value="startup">Startup</option>
                    </select>
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>Session length (seconds)</label>
                    <input type="number" style={{...inputStyle, ...numberInputStyle}} value={avgSessionLength} onChange={(e) => setAvgSessionLength(parseInt(e.target.value))} />
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>Number of sessions</label>
                    <input type="number" style={{...inputStyle, ...numberInputStyle}} value={numSessions} onChange={(e) => setNumSessions(parseInt(e.target.value))} />
                </div>
                <div style={rowStyle}>
                    <button class="btn btn-primary dark:text-white" style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${!headless ? '#7c3aed' : '#000'}`, fontSize: '0.875rem', background: !headless ? (isDarkMode ? 'rgb(124, 58, 237)' : 'rgb(172 134 249)') : undefined }} onClick={() => setHeadless(false)}>Headful</button>
                    <button class="btn btn-primary dark:text-white" style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${headless ? '#7c3aed' : '#000'}`, fontSize: '0.875rem', background: headless ? (isDarkMode ? 'rgb(124, 58, 237)' : 'rgb(172 134 249)') : undefined }} onClick={() => setHeadless(true)}>Headless</button>
                </div>
                <div style={rowStyle}><span style={{ width: '100%', fontSize: '0.8rem', fontStyle: 'italic' }}>${headless ? usagePrices.toFixed(8) : (usagePrices * 8).toFixed(8)}/second</span></div>
            </Card>
            <Card title="Price" icon="circle-dollar">
                <div style={rowStyle}><span style={labelStyle}>Base plan:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease', marginLeft: 'auto' }}>${planPrices[plan].toFixed(2)}</span></div>
                <div style={rowStyle}><span style={labelStyle}>Usage:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease', marginLeft: 'auto' }}>+${usageCost.toFixed(2)}</span></div>
                <div style={rowStyle}><span style={labelStyle}>Free credits:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease', marginLeft: 'auto' }}>-${includedUsageCredits.toFixed(2)}</span></div>
                <div style={rowStyle}><span style={labelStyle}>Total cost:</span> <span style={{ background: flash ? '#e9d5ff' : 'transparent', transition: 'background 0.5s ease', marginLeft: 'auto' }}>${price.toFixed(2)}</span></div>
            </Card>
        </Columns>
    );
};