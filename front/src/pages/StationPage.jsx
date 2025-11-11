import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch } from '../context/AppContext';
import StationChart from '../components/StationChart';
import { DateTime } from "luxon";
import DatePicker from '../components/DatePicker';


const StationPage = () => {
  const { stations, selectedStation, isLoading } = useAppState();

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
   

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

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h2 className="text-l font-medium text-secondary font-sans ">
          Latest reading: <span className='font-light'>
              {DateTime.fromISO(selectedStation.date_time).toUTC().toLocaleString(DateTime.DATETIME_FULL)}
            </span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StationChart />
          </div>
          <DatePicker />
          <div className='lg:col-span-2 flex flex-row'>
            <p id='previous' className='link link-hover text-sm font-light mr-auto' onClick={handleNavigationClick}>{"< Previous"}</p>
            <p id='next' className='link link-hover text-sm font-light ml-auto' onClick={handleNavigationClick}>{"Next >"}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StationPage;