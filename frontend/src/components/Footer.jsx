import { Github, Linkedin } from 'lucide-react'

const Footer = () => {
  return (
      <footer className="footer bg-neutral text-neutral-content w-full">
        <div className="mx-auto flex justify-between w-full py-5 px-4 sm:px-6 lg:px-8">
          <aside>
            <p className='font-medium'>
              TideNet
              <span className='font-light mt-0'><br/>uses Environment Agency tide gauge data from the <a href="https://environment.data.gov.uk/flood-monitoring/doc/tidegauge" target="_blank" className='link link-info'>real-time data API (Beta)</a>.
              <br/>These APIs are provided as open data under the <a href='https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/' target="_blank" className='link link-info'>Open Government Licence</a>.
              </span>
              </p>
          </aside>
          <nav>
            <h6 className="footer-title">Social</h6>
            <div className="grid grid-flow-col gap-4">
              <a href='https://github.com/nikolisan/tidenet.app' target="_blank">
                <Github />
              </a>
              <a href='https://www.linkedin.com/in/nikolaos-andreakos/' target="_blank">
                <Linkedin />
              </a>
            </div>
          </nav>
        </div>
      </footer>
  );
};

export default Footer;