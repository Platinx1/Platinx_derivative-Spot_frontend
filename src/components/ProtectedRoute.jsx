// import { useUser } from "../context/UserContext";


// import { Navigate } from "react-router-dom";

// const ProtectedRoute = ({ children }) => {
//     const userId = localStorage.getItem("user_id");

//     if (!userId) {
//         window.location.replace("https://platinx.exchange/exc/login");
//         return null;
//     }

//     return children;
// };

// export default ProtectedRoute;

// components/ProtectedRoute.js
import Cookies from "js-cookie";

const ProtectedRoute = ({ children }) => {
    // ✅ FIX: localStorage ke sath-sath cookie bhi check karo,
    // kyunki asli source-of-truth cookie hai (jo dashboard/login se set hoti hai)
    const userId = localStorage.getItem("user_id") || Cookies.get("user_id");

    if (!userId) {
        window.location.replace("https://platinx.exchange/exc/login");
        return null;
    }

    // ✅ agar sirf cookie mein mila tha, localStorage bhi sync kar do
    // taaki baaki app (useUser context) turant sahi state paaye
    if (!localStorage.getItem("user_id") && userId) {
        localStorage.setItem("user_id", userId);
    }

    return children;
};

export default ProtectedRoute;