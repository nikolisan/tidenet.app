import { DateTime } from 'luxon';

const StationDataTable = ({ rawData }) => {
  const hasData = rawData?.date_time?.length;

  if (!hasData) {
    return <div className="p-4 text-sm text-base-content/60">No data available.</div>;
  }

  return (
    <div className="max-h-96 lg:max-h-[32rem] overflow-x-auto overflow-y-auto">
      <table className="table table-zebra table-pin-rows">
        <thead>
          <tr>
            <th>#</th>
            <th>Date &amp; Time (UTC)</th>
            <th>Water Level (mAOD)</th>
            <th>Predicted Tide (mAOD)</th>
            <th>Surge Residual (m)</th>
          </tr>
        </thead>
        <tbody>
          {rawData.date_time.map((dt, i) => {
            const waterLevel = rawData.values?.[i];
            const predictedTide = rawData.astro?.[i];
            const surge = rawData.surge?.[i];

            return (
              <tr key={`${dt}-${i}`}>
                <th>{i + 1}</th>
                <td>{DateTime.fromISO(dt).toUTC().toFormat('dd MMM yyyy HH:mm')}</td>
                <td className="font-mono">{waterLevel !== undefined ? waterLevel.toFixed(3) : '—'}</td>
                <td className="font-mono">{predictedTide !== undefined ? predictedTide.toFixed(3) : '—'}</td>
                <td className={"font-mono"}>
                  {surge !== undefined ? `${surge > 0 ? '+' : ''}${surge.toFixed(3)}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StationDataTable;
