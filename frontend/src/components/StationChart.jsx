import { useRef, useImperativeHandle, forwardRef } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { useAppState } from '../context/AppContext';
import { AlertBox } from '../components/Alert';
import { parse as CParse, formatRgb, formatHsl } from 'culori';
// import { _cssVarToRGBA, _cssVarToHSL } from '../utils/colorHelpers'; // Ensure these are accessible

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
  const echartsRef = useRef(null);

  const fetchChartData = async () => {
    let apiUrl = `${baseUrl}/data/${selectedStation.label}`;
    if (dateRange.start && dateRange.end) {
      apiUrl += `?start_date=${dateRange.start}&end_date=${dateRange.end}`;
    }
    const response = await axios.get(apiUrl);
    const rawData = response.data;

    // DATA TRANSFORMATION: 
    // Converting your API's split arrays into ECharts [x, y] coordinates
    if (rawData.date_time && rawData.values) {
      return rawData.date_time.map((dt, i) => [dt, rawData.values[i]]);
    }
    throw new Error('Malformed data received from API');
  };

  const { data: chartData = [], isLoading, error } = useQuery({
    queryKey: ['chartData', selectedStation?.label, dateRange.start, dateRange.end],
    queryFn: fetchChartData,
    enabled: !!selectedStation,
  });

  // Expose Chart functionality to parent
  useImperativeHandle(ref, () => ({
    getChartImage: () => {
      const chartInstance = echartsRef.current?.getEchartsInstance();
      return chartInstance ? chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }) : null;
    }
  }));

  const options = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' }
    },
    grid: {
      top: '10%',
      left: '5%',
      right: '5%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: _cssVarToRGBA("--color-base-content") } },
      axisLabel: { color: _cssVarToRGBA("--color-base-content"), fontSize: 11 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: _cssVarToRGBA("--color-base-content") } },
      axisLabel: { color: _cssVarToRGBA("--color-base-content") },
      // splitLine: { show: false }
      splitLine: { lineStyle: { color: _cssVarToRGBA("--color-base-300") } }
    },
    // Zoom & Pan
    dataZoom: [
      {
        type: 'inside', // Enables mouse-wheel zoom and drag-pan
        xAxisIndex: 0,
        filterMode: 'none'
      },
      {
        type: 'slider', // Visual bar at the bottom
        xAxisIndex: 0,
        bottom: 10,
        height: 20,
        borderColor: 'transparent',
        fillerColor: _cssVarToRGBA("--color-primary-alpha"),
        handleStyle: { color: _cssVarToRGBA("--color-primary") }
      }
    ],
    series: [
      {
        name: 'Water Level',
        type: 'line',
        data: chartData,
        showSymbol: false, 
        sampling: 'lttb', // Preserves peaks/lows while keeping 5k points smooth
        lineStyle: { width: 2, color: _cssVarToHSL('--color-primary') },
        // areaStyle: {
        //   color: _cssVarToRGBA("--color-primary-alpha")
        // }
      }
    ]
  };

  return (
    <div className="card p-6 h-[40vh] w-full">
      {isLoading ? (
        <div className="skeleton bg-base-200 h-full w-full" />
      ) : error ? (
        <AlertBox type="ERROR" message={error.message} />
      ) : !selectedStation ? (
        <AlertBox type="INFO" message="Select a station to view data." />
      ) : (
        <ReactECharts
          ref={echartsRef}
          option={options}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          />
      )}
    </div>
  );
});

export default StationChart;