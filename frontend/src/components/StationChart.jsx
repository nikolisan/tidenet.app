import { useRef, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { AlertBox } from '../components/Alert';

import { parse as CParse, formatRgb, formatHsl } from 'culori';


import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors, TimeScale, elements } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-luxon';
import { Line } from 'react-chartjs-2';


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
          ctx.fillStyle = _cssVarToHSL("--color-primary-alpha");
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

const customCanvasColor = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart, args, options) => {
      const {ctx} = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = options.color || '#ffffff';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
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

export const _cssVarToRGBA = (name) => {
  let val = getComputedStyle(document.documentElement).getPropertyValue(name);
  val = formatRgb(CParse(val))
  return val;
}

const StationChart = forwardRef((props, ref) => {
  
  const { selectedStation, dateRange, baseUrl } = useAppState();
  const chartRef = useRef();

  const startDate = dateRange.start;
  const endDate = dateRange.end;

  const fetchChartData = async () => {
    let apiUrl = `${baseUrl}/api/data/${selectedStation.label}`;
    if (startDate && endDate) {
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
    else {
      throw new Error('Received malformed data. Please try again.');
    }
    return transformedData;
  };

  const { data: chartData = [], isLoading, error } = useQuery({
    queryKey: ['chartData', selectedStation?.label, startDate, endDate],
    queryFn: fetchChartData,
    enabled: !!selectedStation, // Only run if a station is selected
  });

  useImperativeHandle(ref, () => ({
    getChartImage: () => {
      if (chartRef.current) {
        return chartRef.current.toBase64Image();
      }
      return null;
    }
  }));

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
      customCanvasBackgroundColor: {
        color: _cssVarToRGBA("--color-base-100")
      },
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
          
        time: {
          displayFormats: {
            minute: 'dd/LL/yy-HH:mm',
            hour: 'dd/LL/yy-HH:mm',
            day: 'dd/LL/yyyy',
            quarter: 'MMM yyyy'
          }
        },
        zone: "utc",
        grid: {
          color: _cssVarToRGBA("--color-base-content")
        },
        ticks: {
          color: _cssVarToRGBA("--color-base-content"),
          maxRotation: 90,
          minRotation: 0,
          maxTicksLimit: 10,
          font: {
            size: 11, 
            family: "Lucida Console, monospace"
          }
        },
      },
      y: {
        title: {
          display: false,
          text:"Elevation (mAOD)",
          color: _cssVarToRGBA("--color-base-content"),
          font: {
            size: 12, 
            family: "Lucida Console, monospace"
          }
        },
        grid: {
          color: _cssVarToRGBA("--color-base-content")
        },
        ticks: {
          color: _cssVarToRGBA("--color-base-content"),
          font: {
            size: 14, 
            family: "Lucida Console, monospace"
          }
        }
      }
    }
  };

  
  return (
    <div className="card p-6 h-[40vh]">
      {
        // loading
        isLoading 
        ? (
          <div className="skeleton bg-base-200 text-center p-10 h-[60vh]" />
        ) 
        : error ? (
          <AlertBox type="ERROR" message={error?.response?.data?.detail || error.message || String(error)} />
          // <AlertBox type="ERROR" message={error} />
        )
        : (!selectedStation) ? (
          <AlertBox type="ERROR" message={"Select a station to view data."} />
        ) : (
            <Line ref={chartRef} data={data} options={options} plugins={[hoverHighlight, customCanvasColor]} updateMode='active'/>
        )
      }
    </div>
  );
});

export default StationChart;