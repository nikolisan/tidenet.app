import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { AlertBox } from '../components/Alert';

import { parse as CParse, formatHex, formatHsl } from 'culori';


import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors, TimeScale, elements } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-luxon';
import { getElementsAtEvent, Line } from 'react-chartjs-2';
import { tooltip } from 'leaflet';

const hoverHighlight = {
  id: 'hoverHighlight',
  // Draw the custom highlight *after* Chart.js has drawn the main elements
  afterDatasetDraw: (chart, args, options) => {
    // Check if Chart.js has any active elements (i.e., data points being hovered)
    const tooltip = chart.tooltip;

    if (tooltip && tooltip.getActiveElements()) {
      const activeElements = tooltip.getActiveElements();
    // const activeElements = chart.tooltip.getActiveElements();

      
      if (activeElements.length === 0) {
        return; // Stop if nothing is hovered
      }

      const ctx = chart.ctx;
      ctx.save(); // Save the current canvas state

      // Loop through all currently hovered elements
      activeElements.forEach(element => {
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        
        // Get the point element (e.g., Circle element for a line/scatter chart)
        const pointElement = chart.getDatasetMeta(datasetIndex).data[index];
        
        if (pointElement) {
          const { x, y } = pointElement.tooltipPosition(); // Get point center coordinates
          
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw circle of radius 10
          
          // Custom styling for the hover marker
          ctx.fillStyle = _cssVarToHSL("--color-primary-alpha"); // Example: Red semi-transparent fill
          ctx.strokeStyle = _cssVarToHSL("--color-primary-alpha");
          ctx.lineWidth = 1;
          
          ctx.fill();
          ctx.stroke();
          ctx.closePath();
        }
      });

      ctx.restore(); // Restore the canvas state
    }
  }
};


ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Colors,
  zoomPlugin,
  hoverHighlight
);

export const _cssVarToHSL = (name) => {
  let val = getComputedStyle(document.documentElement).getPropertyValue(name);
  val = formatHsl(CParse(val))
  return val;
}

const StationChart = () => {
  
  const { selectedStation, dateRange, error } = useAppState();
  const dispatch = useAppDispatch();
  // local state
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const chartRef = useRef();

  

  const data = {
    datasets: [
      {
        label: 'Water Level',
        data: chartData,
        borderColor: `${_cssVarToHSL('--color-primary')}`,
        backgroundColor:  `${_cssVarToHSL('--color-primary')}`,
        pointStyle: false,
        parsing: {
          xAxisKey: 'date_time',
          yAxisKey: 'elevation',
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false ,
    type: 'line',
    layout: {
    },
    tension: 0.5,
    interaction: {
      mode: 'nearest'
    },
    hover: {
      mode:'nearest',
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        enable: true,
        intersect: false,
        position: 'nearest'

      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x'
        },
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'x'
        }
      },
    },
    scales: {
      x: {
        type: "time",
        zone: "utc"
      }
    }
  };

  // Add data to chart. How to get the chart object????
  const addData = (chart, label, newData) => {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset) => {
      dataset.data.push(newData);
    });
    chart.update();
  }

  useEffect(() => {
      if (!selectedStation) {
        setChartData([]);
        return;
      }
          

      const startDate = dateRange.start;
      const endDate = dateRange.end;

      const fetchData = async () => {
        setLoading(true);

        try {
          let apiUrl = `http://localhost:8000/api/data/${selectedStation.label}`;
          const hasDates = startDate && endDate;
          if (hasDates) {
            apiUrl += `?start_date=${startDate}&end_date=${endDate}`;
          }
          const response = await axios.get(apiUrl);
          const rawData = response.data;

          const transformedData = [];
          if (rawData.date_time && rawData.values && rawData.date_time.length === rawData.values.length) {
            
            for (let i = 0; i < rawData.date_time.length; i++) {
              transformedData.push({
                date_time: rawData.date_time[i],
                elevation: rawData.values[i], 
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
    }, [selectedStation, dateRange]);


    
  // --- Render Logic ---

  return (
    <div className="card  p-6 h-[60vh]">
      {
        loading 
        ? (
          <div className="skeleton bg-base-200 text-center p-10 h-[60vh]" />
        ) 
        : error ? (
          <AlertBox type="ERROR" message={error} />
        )
        : (!selectedStation) ? (
          <AlertBox type="ERROR" message={"Select a station to view data."} />
        ) : (
            <Line ref={chartRef} data={data} options={options} plugins={[hoverHighlight]} updateMode='active'/>
        )
      }
    </div>
  );
};

export default StationChart;