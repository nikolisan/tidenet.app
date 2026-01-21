import { Anchor, Copyright } from 'lucide-react'

const Modal = () => {
return (
    <div>
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg flex flex-row gap-2 items-center">
            <Anchor className="h-4 w-4" />
            TideNet
          </h3>
          <p className="font-light mt-0">
            is a free and open-source application that uses Environment Agency tide gauge data from the <a target="_blank" href="https://environment.data.gov.uk/flood-monitoring/doc/tidegauge" className='link link-info'>real-time data API (Beta)</a>.
          </p>
          <p className="font-light my-2">
            Astronomical tide predictions provided by this application are generated using the <a href="https://github.com/wesleybowman/UTide" target="_blank" className='link link-info'>UTide</a> Python package. UTide is an open-source library for tidal analysis and prediction.
          </p>
          <h4 className="font-semibold m-2 mt-4">Disclaimer</h4>
          <p className="font-light">
            The information provided by this application is for informational purposes only and is not guaranteed to be accurate, complete, or current. The developers and providers expressly disclaim all liability for any errors, omissions, or inaccuracies in the data, and for any actions taken in reliance thereon. By using this application, you acknowledge and accept full responsibility for any consequences resulting from its use, and agree to hold the developers and providers harmless from any claims or damages arising from your use of the information. 
            <br/> For full terms and conditions, see the <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" className="link link-info">Terms and Conditions</a>
          </p>
          <div className="flex flex-col items-left justify-left mt-6 text-xs text-muted-foreground gap-1">
            <span className="mt-1 text-left">Created by Nikolaos Andreakos under the <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" className="link link-info">GNU GPLv3 License</a>.</span>
            <span className="mt-1 text-left">
              Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" className="link link-info">Open Government Licence v3.0</a>.
            </span>            
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
    </div>
)};

export default Modal;