const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-label">{label}</div>
        <div className="tooltip-val">${payload[0].value?.toLocaleString()}</div>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
