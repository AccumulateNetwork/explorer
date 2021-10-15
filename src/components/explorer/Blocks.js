import React, { useEffect } from 'react';

import Stats from './../common/Stats';

const Blocks = () => {

  useEffect(() => {
    document.title = "Blocks | Accumulate Explorer";
  }, []);

  return (
    <div>

      <div className="stats">
        <Stats />
      </div>

    </div>
  );
}

export default Blocks;
