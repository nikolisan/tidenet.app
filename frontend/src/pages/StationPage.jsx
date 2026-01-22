import { useRef } from 'react'
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '../context/AppContext';
import StationChart from '../components/StationChart';
import { DateTime } from "luxon";
import DatePicker from '../components/DatePicker';
import Breadcrumb from '../components/Breadcrumb';

import { MapPin, ChevronsUpDown , Gauge, Droplets, Info, ImageDown} from 'lucide-react'
import { AlertBox } from '../components/Alert';


const StationPage = () => {
  const { stations, selectedStation, isLoading, dateRange, error } = useAppState();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const chartComponentRef = useRef();

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
                      <p className="text-3xl font-semibold font-mono text-error">-- m</p>
                      {/* <p className={`text-3xl font-semibold font-mono ${selectedStation.latest_reading < 0 ? 'text-error' : 'text-success'}`}>{selectedStation?.latest_reading > 0 ? '+' : ''}-- m</p> */}
                      <p className='text-md text-base-content/50'>Still under development</p>
                    </div>
                  </div>
                </div>
                

              </div>
              
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-3 card shadow-lg border border-base-300">
              <div className="card-body px-0">
                <div className="flex flex-row items-baseline gap-2 mb-4 sm:flex-row px-4">
                  <div className="grow flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-base-content/50" />
                    <p className="text-sm text-base-content/50">Click on a label to toggle visibility</p>
                  </div>
                  <button className="invisible md:visible btn btn-ghost" onClick={handleDownloadImage}>
                    <ImageDown className='text-base-content/40'/>
                  </button>
                </div>
                <StationChart ref={chartComponentRef}/>
              </div>
            </div>
            <div className='lg:col-span-3 flex flex-row'>
              <p id='previous' className='link link-hover text-sm font-light mr-auto' onClick={handleNavigationClick}>{"< Previous"}</p>
              <p id='next' className='link link-hover text-sm font-light ml-auto' onClick={handleNavigationClick}>{"Next >"}</p>
            </div>
          </div>
        </div>
    </Layout>
  );
};

export default StationPage;