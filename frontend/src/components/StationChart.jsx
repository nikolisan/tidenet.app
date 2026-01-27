import { useRef, useImperativeHandle, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { AlertBox } from '../components/Alert';
import { parse as CParse, formatRgb, formatHsl } from 'culori';

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


const StationChart = forwardRef(({ chartData = { values: [], astro: [], surge: [] }, isLoading = false, error = null, selectedStation = null }, ref) => {
  const echartsRef = useRef(null);

  // Responsive configuration based on screen size
  const isMobile = window.innerWidth < 768;
  const lineWidth = isMobile ? 1 : 2;
  const fontSize = isMobile ? 9 : 11;
  const gridTop = isMobile ? '15%' : '8%';
  const gridBottom = isMobile ? '5%' : '25%';
  const gridLeft = isMobile ? '12%' : '0%';
  const gridRight = isMobile ? '5%' : '0%';
  const axisLabel = isMobile ? 'Water Level (mAOD)' : 'Water Level (mAOD)';
  const legendTop = isMobile ? '-1%' : '0%';
  const legendLeft = isMobile ? 'left' : 'center';
  const legendOrient = isMobile ? 'vertical' : 'horizontal';
  const dataZoomSlider = isMobile ? false : true;

  // Expose Chart functionality to parent
  useImperativeHandle(ref, () => ({
    getChartImage: (opts = {}) => {
      const chartInstance = echartsRef.current?.getEchartsInstance();
      if (!chartInstance) return null;
      return chartInstance.getConnectedDataURL({
        type: 'png',
        backgroundColor: _cssVarToRGBA("--color-base-100"),
        excludeComponents: ['toolbox', 'dataZoom'],
        ...opts,
      });
    }
  }));

  const options = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        
        const time = new Date(params[0].value[0]).toLocaleString();
        let tooltip = `${time}<br/>`;
        
        // Add each series value
        params.map((param, index) => {
          const value = param.value[1];
          if (index < 2) {
            tooltip += `${param.marker} ${param.seriesName}: ${value.toFixed(2)} m<br/>`;
          }
        });
        
        // Calculate and add surge residual (Water Level - Astronomical Tide)
        if (params.length >= 2) {
          const waterLevel = params[0].value[1];
          const astroTide = params[1].value[1];
          const surge = waterLevel - astroTide;
          tooltip += `<strong style="color: ${surge > 0 ? '#22c55e' : '#ef4444'}">Surge: ${surge > 0 ? '+' : ''}${surge.toFixed(2)} m</strong>`;
        }
        
        return tooltip;
      }
    },
    legend: {
      show: true,
      top: legendTop,
      left: legendLeft,
      orient: legendOrient,
      icon: "rect",
      textStyle: { fontSize: isMobile ? 10 : 12, fontFamily: 'monospace', color:_cssVarToRGBA("--color-base-content"), inactiveColor:_cssVarToRGBA("--color-base-content/60") }
    },
    grid: {
      top: gridTop,
      left: gridLeft,
      right: gridRight,
      bottom: gridBottom,
      containLabel: false
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: _cssVarToRGBA("--color-base-content") } },
      axisLabel: { color: _cssVarToRGBA("--color-base-content"), fontSize: fontSize },
      // splitLine: { show: false },
      label: {
        show: true,
        formatter: function (params) {
          return echarts.format.formatTime('yyyy-MM-dd', params.value);
        },
          backgroundColor: '#7581BD'
      },
      handle: {
        show: true,
        color: '#7581BD'
      }
    },
    yAxis: {
      type: 'value',
      name: axisLabel,
      nameLocation: 'center',
      nameTextStyle: {fontFamily: 'monospace'},
      axisLine: { lineStyle: { color: _cssVarToRGBA("--color-base-content") } },
      axisLabel: { color: _cssVarToRGBA("--color-base-content"), fontSize: fontSize },
      // splitLine: { show: false },
      // splitLine: { lineStyle: { color: _cssVarToRGBA("--color-base-300") } }
    },
    // Zoom & Pan
    toolbox: {
      show: true,
      right: gridRight,
      top: gridTop,
      feature: {
        dataZoom: { yAxisIndex: 'none' }, // drag a box on x-axis to zoom
        restore: {}
      }
    },
    dataZoom: [
      {
        type: 'inside', // Enables mouse-wheel zoom and drag-pan
        xAxisIndex: 0,
        filterMode: 'none'
      },
      {
        type: 'slider', // Visual bar at the bottom
        show: dataZoomSlider,
        xAxisIndex: 0,
        borderColor: 'transparent',
        fillerColor: _cssVarToRGBA("--color-primary-alpha"),
        handleStyle: { color: _cssVarToRGBA("--color-primary") }
      }
    ],
    series: [
      {
        name: 'Water Level',
        type: 'line',
        data: chartData.values || [],
        showSymbol: false, 
        sampling: 'lttb', // Preserves peaks/lows while keeping 5k points smooth
        lineStyle: { width: lineWidth, color: _cssVarToHSL('--color-primary') },
        itemStyle: { color: _cssVarToHSL('--color-primary') },
      },
      {
        name: 'Predicted Tide',
        type: 'line',
        data: chartData.astro || [],
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { type: 'dotted', width: lineWidth, color: _cssVarToHSL('--color-secondary') },
        itemStyle: { color: _cssVarToHSL('--color-secondary') },
      },
      {
        name: 'Surge Residual',
        type: 'line',
        data: chartData.surge || [],
        showSymbol: false,
        sampling: 'lttb',
        areaStyle: { opacity: 0.1, color: _cssVarToHSL('--color-accent') },
        lineStyle: { opacity: 0.2, type: 'solid', width: lineWidth, color: _cssVarToHSL('--color-accent') },
        itemStyle: { color: _cssVarToHSL('--color-accent') },
      }
    ]
  };

  return (
    <div className={`card p-4 ${isMobile ? 'h-[60vh]' : 'h-[40vh]'} w-full`}>
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