import Layout from '../components/Layout';
import { DateTime } from 'luxon';
import ScrollArea from '../components/ScrollArea';

const TextPage = ({text}) => {

  let ind = 0;
  const lines = text ? text.split('\n'): [];

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
        <ScrollArea className='h-[calc(100vh-20vh)]'>
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