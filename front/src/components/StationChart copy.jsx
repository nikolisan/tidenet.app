import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { AlertBox } from '../components/Alert';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, Brush
} from 'recharts';

const StationChart = () => {
  const { selectedStation, dateRange, error } = useAppState();
  const dispatch = useAppDispatch();
  // local state
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [activeSeries, setActiveSeries] = useState(['reading_value']);


  const startDate = dateRange.start;
  const endDate = dateRange.end;

  // Use the selected station label and date range as dependencies for data fetching
  useEffect(() => {
      if (!selectedStation) {
        setChartData([]);
        return;
      }

      const fetchData = async () => {
        setLoading(true);
        setChartData([]); 

        try {
          let apiUrl = `http://localhost:8000/api/data/${selectedStation.label}`;
          const hasDates = startDate && endDate;
          if (hasDates) {
            // Append dates only if both are present
            apiUrl += `?start_date=${startDate}&end_date=${endDate}`;
          }
          const response = await axios.get(apiUrl);
          const rawData = response.data; // This is the object with parallel arrays
          
          // 💡 FIX: Transform the data structure
          const transformedData = [];
          if (rawData.date_time && rawData.values && rawData.date_time.length === rawData.values.length) {
            
            for (let i = 0; i < rawData.date_time.length; i++) {
              transformedData.push({
                timestamp: rawData.date_time[i],
                reading_value: rawData.values[i], 
              });
            }
          }
          setChartData(transformedData);
          
        } catch (err) {
          console.log("Error: ", err)
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load tide data.' })
          setChartData([]);

        } finally {
          setLoading(false);
        }
      };      
      fetchData();
    }, [selectedStation, startDate, endDate]);

  // Memoize data transformation (optional, but good practice for complex data)
  const processedData = useMemo(() => {
    // Check if chartData exists before mapping
    if (!chartData || chartData.length === 0) return [];

    return chartData.map(d => ({
        ...d,
        // Convert timestamp for better XAxis display if needed
        // Removed `options=` which can cause issues, just pass the object
        time: new Date(d.timestamp).toUTCString()
    }));
  // 🐛 FIX 4: Add `chartData` as a dependency for useMemo
  }, [chartData]);

  const chartMargin = useMemo(() => ({
      top: 5, 
      right: 20, 
      left: 10, 
      bottom: 5 
  }), []);

  const handleLegendClick = (data) => {
    const dataKey = data.dataKey;
    setActiveSeries(prev => 
      prev.includes(dataKey) 
        ? prev.filter(key => key !== dataKey) // Remove it (hide it)
        : [...prev, dataKey]                  // Add it (show it)
    );
  };
  // --- Render Logic ---
  if (loading) return <div className="skeleton bg-base-200 text-center p-10 w-full h-full"></div>;
  // Use `selectedStation.label` for a non-null check if needed, but `selectedStation` is usually enough
  if (!selectedStation) return <div className="text-center p-10">Select a station to view data.</div>;
  if (error) return <AlertBox type="ERROR" message={error} />;
  if (processedData.length === 0) return <div className="text-center p-10">No data available for the selected range.</div>;

  return (
    <div className="card bg-base-200 shadow-xl p-6 h-[60vh]">
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={processedData} margin={chartMargin}>
          <CartesianGrid stroke="var(--color-secondary)" strokeDasharray="1" />
          <Legend verticalAlign="top" height={36} onClick={handleLegendClick}/>
          <XAxis 
              dataKey="timestamp" // Use the full ISO timestamp key
              tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          >
            <Label 
              value="Date / Time"
            />
          </XAxis>
          <YAxis>
            <Label 
              value="Elevation (mAOD)"
            /> 
          </YAxis>
          <Tooltip />
          <Line connectNulls hide={!activeSeries.includes('reading_value')} type="monotone" dataKey="reading_value" stroke="var(--color-primary)" name="Water level" unit="mAOD" dot={false}/>
          {/* <Brush /> */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StationChart;