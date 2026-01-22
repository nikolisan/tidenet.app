import Layout from '../components/Layout';
import { AlertBox } from '../components/Alert';


const NotFoundPage = () => (
  <Layout>
    <div className="flex flex-col items-center justify-center h-96">
      <AlertBox type="ERROR" message="404 - Page Not Found" />
      <p className="mt-4 text-lg text-base-content/70">Sorry, the page you are looking for does not exist.</p>
    </div>
  </Layout>
);

export default NotFoundPage;
