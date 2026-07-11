import {
    Routes,
    Route
}
from "react-router-dom";

import POSPage
from "../../pages/POSPage";

function POSRoutes() {

    return (

        <Routes>

            <Route
                path="/pos"
                element={<POSPage />}
            />

        </Routes>
    );
}

export default POSRoutes;