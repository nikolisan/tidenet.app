import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAppState } from '../context/AppContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StationChart = () => {
  const { selectedStation, dateRange } = useAppState();
  const state = useState();
  const [loading, setLoading] = useState(false);

  // Use the selected station label and date range as dependencies for data fetching
  useEffect(() => {
    if (!selectedStation ||!dateRange.start ||!dateRange.end) {
      setChartData(); // Clear data if prerequisites are not met
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setChartData();
      try {
        // Build the dynamic API endpoint [Image 2]
        const apiUrl = `http://localhost:8000/api/data/${selectedStation.label}?start_date=${dateRange.start}&end_date=${dateRange.end}`;
        
        const response = await axios.get(apiUrl);
        // Assuming the API returns data ready for Recharts: [{ timestamp: "...", value: 12.3 },...]
        setChartData(response.data);
      } catch (err) {
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  },); // Dependencies trigger refetch [13]

  // Memoize data transformation (optional, but good practice for complex data) [13]
  const processedData = useMemo(() => {
    // Recharts requires an array of objects for the LineChart [14]
    return chartData.map(d => ({
       ...d,
        // Convert timestamp for better XAxis display if needed
        time: new Date(d.timestamp).toLocaleTimeString(options={ hour: '2-digit', minute: '2-digit' })
    }));
  },);

  if (loading) return <div className="text-center p-10"><span className="loading loading-spinner loading-lg"></span> Loading chart data...</div>;
  if (!selectedStation) return <div className="text-center p-10">Select a station to view data.</div>;
  if (processedData.length === 0) return <div className="text-center p-10">No data available for the selected range.</div>;

  return (
    <div className="card bg-base-200 shadow-xl p-6 h-[60vh]">
      <h2 className="text-xl font-bold text-red-600 mb-4">Recharts.js line chart</h2>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={processedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          {/* Use 'time' or 'timestamp' for the X-axis data key */}
          <XAxis dataKey="time" /> 
          <YAxis />
          <Tooltip />
          <Legend />
          {/* Assuming one measurement called 'reading_value' */}
          <Line type="monotone" dataKey="reading_value" stroke="#8884d8" name="Latest Reading" activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StationChart;