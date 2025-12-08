const defaultWidth = 120;
const defaultHeight = 36;

function buildPath(data, w = defaultWidth, h = defaultHeight) {
    if (!data || data.length === 0) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1);

    return data.map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
}

export function Sparkline({ data = [], color = '#6ee7b7', width = defaultWidth, height = defaultHeight, stroke = 2 }) {
    const path = buildPath(data, width, height);
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <path d={path} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export const SparklineUp = () => (
    <svg width="100" height="30" viewBox="0 0 100 30" fill="none" stroke="#16c784" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 25 C20 25, 20 10, 40 15 S 60 5, 80 10 S 100 0, 100 0" />
    </svg>
);

export const SparklineDown = () => (
    <svg width="100" height="30" viewBox="0 0 100 30" fill="none" stroke="#ea3943" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 5 C20 5, 20 20, 40 15 S 60 25, 80 20 S 100 30, 100 30" />
    </svg>
);

export const SparklineNeutral = () => (
    <svg width="100" height="30" viewBox="0 0 100 30" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 10 C20 15, 20 10, 40 15 S 60 20, 80 15 S 100 25, 100 25" />
    </svg>
);
