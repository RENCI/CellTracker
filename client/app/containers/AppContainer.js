// Controller-view for the application that stores the current dataset

var React = require("react");
var HeaderSection = require("../components/HeaderSection");
var MainSection = require("../components/MainSection");

class AppContainer extends React.Component {
  constructor() {
    super();
  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  componentDidUpdate() {

  }

  render() {
    return (
      <div className="container-fluid">
        <HeaderSection />
        <MainSection />
      </div>
    );
  }
}

module.exports = AppContainer;
