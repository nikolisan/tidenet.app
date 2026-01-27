import { useRef, useEffect, useState } from 'react'
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '../context/AppContext';
import StationChart from '../components/StationChart';
import StationDataTable from '../components/StationDataTable';
import Toast from '../components/Toast';
import { DateTime } from "luxon";
import DatePicker from '../components/DatePicker';
import Breadcrumb from '../components/Breadcrumb';

import { MapPin, ChevronsUpDown , Gauge, Droplets, Info, ImageDown, Download, Waves} from 'lucide-react'
import { AlertBox } from '../components/Alert';


const StationPage = () => {
  const { stations, selectedStation, isLoading, dateRange, error, baseUrl } = useAppState();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const chartComponentRef = useRef();
  const [toast, setToast] = useState(null);

  const fetchChartData = async () => {
    let apiUrl = `${baseUrl}/data/${selectedStation.label}`;
    if (dateRange.start && dateRange.end) {
      apiUrl += `?start_date=${dateRange.start}&end_date=${dateRange.end}`;
    }
    const response = await axios.get(apiUrl);
    const rawData = response.data;

    // DATA TRANSFORMATION: 
    // Converting your API's split arrays into ECharts [x, y] coordinates
    if (rawData.date_time && rawData.values && rawData.astro && rawData.surge) {
      return {
        values: rawData.date_time.map((dt, i) => [dt, rawData.values[i]]),
        astro: rawData.date_time.map((dt, i) => [dt, rawData.astro[i]]),
        surge: rawData.date_time.map((dt, i) => [dt, rawData.surge[i]]),
        latestValue: rawData.values[rawData.values.length - 1],
        latestAstro: rawData.astro[rawData.astro.length - 1],
        rawData: rawData
      };
    }
    throw new Error('Malformed data received from API');
  };

  const { data: chartData = { values: [], astro: [], surge: [], latestValue: 0, latestAstro: 0, rawData: {} }, isLoading: isChartLoading, error: chartError } = useQuery({
    queryKey: ['chartData', selectedStation?.label, dateRange.start, dateRange.end],
    queryFn: fetchChartData,
    enabled: !!selectedStation,
  });

  // Fetch tidal table information
  const fetchTidalInfo = async () => {
    const response = await axios.get(`${baseUrl}/data/${selectedStation.label}/table`);
    return response.data;
  };

  const { data: tidalData = { tidal_info: {} }, isLoading: isTidalLoading } = useQuery({
    queryKey: ['tidalInfo', selectedStation?.label],
    queryFn: fetchTidalInfo,
    enabled: !!selectedStation,
  });

  // Calculate residual surge (latest value - latest astronomical tide)
  const residualSurge = chartData.latestValue !== undefined && chartData.latestAstro !== undefined 
    ? chartData.latestValue - chartData.latestAstro 
    : null;

  // Update date range when API returns actual dates (due to 6-month restriction)
  useEffect(() => {
    if (chartData.rawData?.actual_start_date && chartData.rawData?.actual_end_date) {
      const actualStart = chartData.rawData.actual_start_date;
      const actualEnd = chartData.rawData.actual_end_date;
      
      // Only update if different from current date range
      if (dateRange.start !== actualStart || dateRange.end !== actualEnd) {
        dispatch({ 
          type: 'SET_DATE_RANGE', 
          payload: { start: actualStart, end: actualEnd } 
        });
      }
    }
  }, [chartData.rawData?.actual_start_date, chartData.rawData?.actual_end_date, dateRange.start, dateRange.end, dispatch]);

  const handleDownloadImage = () => {
    if (chartComponentRef.current) {
      const image = chartComponentRef.current.getChartImage();
      if (image) {
        let start = dateRange?.start ? DateTime.fromISO(dateRange.start).toFormat('yyyyLLdd\'T\'HHmm') : 'start';
        let end = dateRange?.end ? DateTime.fromISO(dateRange.end).toFormat('yyyyLLdd\'T\'HHmm') : 'end';
        // Clean label for filename
        let label = selectedStation.label.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${label}-${start}-${end}.png`;
        const link = document.createElement('a');
        link.href = image;
        link.download = filename;
        link.click();
      }
    }
  };

  const handleDownloadCsv = () => {
    const raw = chartData?.rawData;
    if (!raw?.date_time?.length) {
      setToast({ message: 'No data available to download.', type: 'error' });
      return;
    }

    const { date_time, values, astro, surge } = raw;
    const rows = ['datetime,value_mAOD,predicted_tide_mAOD,surge_residual_m'];

    date_time.forEach((dt, i) => {
      const val = values?.[i];
      const a = astro?.[i];
      const s = surge?.[i];
      rows.push(`${dt},${val ?? ''},${a ?? ''},${s ?? ''}`);
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const label = selectedStation?.label?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'station';
    const start = dateRange?.start ? DateTime.fromISO(dateRange.start).toFormat('yyyyLLdd') : 'start';
    const end = dateRange?.end ? DateTime.fromISO(dateRange.end).toFormat('yyyyLLdd') : 'end';

    link.href = url;
    link.download = `${label}-${start}-${end}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setToast({ message: 'CSV download started.', type: 'info' });
  };

  const handleNavigationClick = (event) =>{
    if (!selectedStation) return;
    const currentIndex = selectedStation.listId;
    const id = event.target.id;
    const maxIndex = stations.length - 1;
    let newIndex;
    if (id === 'next') {
      newIndex = currentIndex === maxIndex ? 0 : currentIndex + 1;
    } else if (id === 'previous') {
      newIndex = currentIndex === 0 ? maxIndex : currentIndex - 1;
    }
    const station = stations[newIndex]
    const selectedStationPayload = { ...station, listId: newIndex };
    dispatch({ type: 'SELECT_STATION', payload: selectedStationPayload });
    navigate(`/station/${station.label}`);
  }

  useEffect(() => {
    if (!toast?.message) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);


  if (isLoading) {
    return (
        <Layout>
            <div className="skeleton flex justify-center items-center h-96">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <AlertBox type="ERROR" message={error?.response?.data?.detail || error.message || String(error)} />
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="flex flex-col gap-2">
          <h1 className='text-4xl font-bold tracking-tight text-foreground'>{selectedStation.label}</h1>

          <div className="flex flex-col items-start xl:flex-row xl:items-center font-light gap-4">
            <div className='flex grow gap-4 items-center text-base-content'>
              <MapPin className="h-4 w-4 text-primary" />
              {selectedStation.lat.toFixed(4)}°N, {selectedStation.lon.toFixed(4)}°E
            </div>
            <DatePicker />
          </div>

          <Breadcrumb />
          
          {/* Station Information Section */}
          <div tabIndex={0} className="collapse md:collapse-open border-base-300 px-0">
            <div className="collapse-title font-light flex flex-row items-center gap-2">
              <ChevronsUpDown className='visible md:hidden w-4 h-4'/>
              <span>Station Information</span>
            </div>
            <div className="collapse-content text-sm px-0">
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="card grow border border-base-300 shadow-md">
                  <div className="card-body">
                    <div className="card-title text-sm uppercase tracking-wider flex flex-row items-center">
                      <Gauge className='w-5 h-5'/>
                      <span>Latest Reading</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className='text-3xl font-semibold font-mono text-primary'>{selectedStation?.latest_reading > 0 ? '+' : ''}{selectedStation?.latest_reading?.toFixed(2)} mAOD</p>
                      <p className='text-md text-base-content/50'>{DateTime.fromISO(selectedStation.date_time).toUTC().toFormat('dd MMM yyyy \'at\' HH:mm \'UTC\'')}</p>
                    </div>
                  </div>
                </div>

                <div className="card grow border border-base-300 shadow-md">
                  <div className="card-body">
                    <div className="card-title text-sm uppercase tracking-wider flex flex-row items-center">
                      <Droplets className='w-5 h-5'/>
                      <span>Surge Residual</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className={`text-3xl font-semibold font-mono ${residualSurge > 0 ? 'text-success' : 'text-error'}`}>{residualSurge !== null ? (residualSurge > 0 ? '+' : '') + residualSurge.toFixed(2) : '--'} m</p>
                      <p className='text-md text-base-content/50'>{residualSurge !== null ? 'Latest surge above predicted tide' : 'No data available'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Station Chart & Info */}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            <div className="tabs tabs-lift lg:col-span-3 ">
              {/* Chart Card Section */}
              <input type="radio" name="my_tabs_1" className="tab" aria-label="Station Chart" defaultChecked />
              <div className="tab-content bg-base-100 border-base-300 shadow-lg p-2">
                <div className="flex flex-row items-baseline gap-2 mb-4 sm:flex-row px-4">
                  <div className="grow flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-base-content/50" />
                    <p className="text-sm text-base-content/50">Click on a label to toggle visibility</p>
                  </div>
                  <button className="invisible md:visible btn btn-ghost" onClick={handleDownloadImage}>
                    <ImageDown className='text-base-content/40'/>
                  </button>
                </div>
                <StationChart 
                  ref={chartComponentRef}
                  chartData={chartData}
                  isLoading={isChartLoading}
                  error={chartError}
                  selectedStation={selectedStation}
                />
              </div>
              {/* Data Table Section */}
              <input type="radio" name="my_tabs_1" className="tab" aria-label="Data Table" />
              {chartData.rawData?.date_time?.length ? (
              <div className="tab-content bg-base-100 border-base-300 shadow-lg p-2">
                <StationDataTable rawData={chartData.rawData} />
                <div className="flex flex-row items-baseline gap-2 mt-4 sm:flex-row px-4">
                  <div className="md:hidden grow flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-base-content/50" />
                    <p className="text-xs text-base-content/50">Download available only in Desktop version.</p>
                  </div>
                  <div className="hidden md:flex grow items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-base-content/50" />
                    <p className="text-sm text-base-content/50">You can download the dataset in CSV format.</p>
                  </div>
                  <button className="invisible md:visible btn btn-ghost" onClick={handleDownloadCsv}>
                    <Download className='text-base-content/40'/>
                  </button>
                </div>
              </div>
              ) : (
              <div className="tab-content bg-base-100 border-base-300 shadow-lg p-4">
                <div className="skeleton h-96"></div>
              </div>
              )}
            </div>

            <div className="lg:col-span-1 lg:mt-9">
              <div className="card bg-base-100 border border-base-300 shadow-lg p-2">
                <div className="card-body">
                  <h2 className="card-title">
                    <Waves className='w-5 h-5'/>
                    <span>Tidal Table</span>
                  </h2>
                  <div className="text-xs text-base-content/50">Tidal levels and predictions may differ from officially published station data due to limited data availability.</div>
                  <div className="overflow-x-auto overflow-y-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Tidal Level</th>
                          <th className="text-right pr-5">Value (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isTidalLoading ? (
                          <tr>
                            <td colSpan="2" className="skeleton h-32 w-32"></td>
                          </tr>
                        ) : (
                          <>
                            <tr>
                              <td className="font-semibold">MHWS</td>
                              <td className="font-mono text-right pr-5">{tidalData.tidal_info?.MHWS?.toFixed(1) ?? '—'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">MHWN</td>
                              <td className="font-mono text-right pr-5">{tidalData.tidal_info?.MHWN?.toFixed(1) ?? '—'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">MLWN</td>
                              <td className="font-mono text-right pr-5">{tidalData.tidal_info?.MLWN?.toFixed(1) ?? '—'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">MLWS</td>
                              <td className="font-mono text-right pr-5">{tidalData.tidal_info?.MLWS?.toFixed(1) ?? '—'}</td>
                            </tr>
                            <tr className="border-t-2">
                              <td className="font-semibold">Spring Range</td>
                              <td className="font-mono text-right pr-5">{tidalData.tidal_info?.srange?.toFixed(1) ?? '—'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">Neap Range</td>
                              <td className="font-mono text-right pr-5">{tidalData.tidal_info?.nrange?.toFixed(1) ?? '—'}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>



            {/* Next/Previous Buttons */}
            <div className='lg:col-span-3 flex flex-row'>
              <p id='previous' className='link link-hover text-sm font-light mr-auto' onClick={handleNavigationClick}>{"< Previous"}</p>
              <p id='next' className='link link-hover text-sm font-light ml-auto' onClick={handleNavigationClick}>{"Next >"}</p>
            </div>
          </div>
        </div>
        {toast?.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
    </Layout>
  );
};

export default StationPage;