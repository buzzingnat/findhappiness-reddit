import React from 'react';
import './Spinner.scss';

// inspired by lds-ripple from https://loading.io/css/

function Spinner() {
    return (
        <div className="spinner-container">
            <div className="spinner-ripple">
              <div></div>
              <div></div>
            </div>
        </div>
    );
}

export default Spinner;
