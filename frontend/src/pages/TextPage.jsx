import Layout from '../components/Layout';
import { DateTime } from 'luxon';
import ScrollArea from '../components/ScrollArea';
import { useEffect, useState } from 'react';

const TextPage = ({ text, docUrl }) => {
  const [content, setContent] = useState(text || '');
  const [loading, setLoading] = useState(!!docUrl);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (docUrl) {
      console.log('Fetching from:', docUrl);
      fetch(docUrl)
        .then(res => {
          console.log('Response status:', res.status);
          console.log('Response type:', res.headers.get('content-type'));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then(data => {
          console.log('Content length:', data.length);
          console.log('First 100 chars:', data.substring(0, 100));
          // Check if HTML was returned (likely an error)
          if (data.includes('<!doctype') || data.includes('<html')) {
            throw new Error('Received HTML instead of text file. Check if file exists.');
          }
          setContent(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Fetch error:', err);
          setError(err.message);
          setLoading(false);
        });
    }
  }, [docUrl]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="alert alert-error">
          <span>Failed to load document: {error}</span>
        </div>
      </Layout>
    );
  }

  let ind = 0;
  const lines = content ? content.split('\n'): [];

  const rawDate = lines[0].trim();
  const dt = DateTime.fromFormat(rawDate, "dd LLLL yyyy");

  if (dt.isValid) {
    ind = ind + 1
  }


  const header = lines[ind]
  const body = lines.slice(ind+1)


  const hasValidDate = dt.isValid;

  return (
    <Layout>
        <h1 className='text-4xl font-bold'>{header}</h1>
        {dt.isValid && (
          <h2 className="mt-2 font-light italic">
            Last Updated:
            <span className="mx-2 text-secondary">
              {dt.toLocaleString(DateTime.DATE_MED)}
            </span>
          </h2>
        )}
        <ScrollArea className='h-[calc(100vh-40vh)] md:h-[calc(100vh-20vh)]'>
          <div className="font-mono mt-4 lg:text-lg" style={{ whiteSpace: 'pre-wrap' }}>
            {body.map((line, index) => {
              // Check if the line starts with a digit (\d)
              const startsWithNumber = /^\d/.test(line.trim());

              return (
                <div key={index} className={startsWithNumber ? "font-bold text-lg lg:text-xl text-primary" : ""}>
                  {line}
                  <br />
                </div>
              );
            })}
          </div>
        </ScrollArea>
    </Layout>
  );
};

export default TextPage;