var React = require("react");

function HeaderSection() {
  return (
    <div className="row well">
      <div className="col-sm-3 text-center">
        <a href="http://www.med.unc.edu/genetics/purvislab">
          <img
            src="/static/ct_core/images/ccb_logo_alpha_cropped.png"
            style={{height: 80}} />
        </a>
      </div>
      <div className="col-sm-6 text-center">
        <h2>
          <strong>TRacking and Analysis of CEll Cycle (TRACE)</strong>
        </h2>
      </div>
      <div className="col-sm-3 text-center">
        <div>
          <a href="http://www.unc.edu/">
            <img
              src="/static/ct_core/images/medium_blue_450px.png"
              style={{height: 50}} />
          </a>
        </div>
        <div>
          <a href="http://renci.org/">
            <img
              src="/static/ct_core/images/RENCI-Official-Logo-No-Tagline-cropped-alpha.png"
              style={{height: 30}} />
          </a>
        </div>
      </div>
    </div>
  );
}

module.exports = HeaderSection;
