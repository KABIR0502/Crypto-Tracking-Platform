import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import { Avatar, TextField, Button } from "@material-ui/core";
import { CryptoState } from "../../CryptoContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { numberWithCommas } from "../CoinsTable";
import { AiFillDelete } from "react-icons/ai";
import { getDoc, doc, setDoc} from "firebase/firestore";

const useStyles = makeStyles({
  container: {
    width: 350,
    padding: 25,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    fontFamily: "monospace",
  },
  profile: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    height: "92%",
  },
  logout: {
    height: "8%",
    width: "100%",
    backgroundColor: "#EEBC1D",
    marginTop: 20,
  },
  picture: {
    width: 200,
    height: 200,
    cursor: "pointer",
    backgroundColor: "#EEBC1D",
    objectFit: "contain",
  },
  watchlist: {
    flex: 1,
    width: "100%",
    backgroundColor: "grey",
    borderRadius: 10,
    padding: 15,
    paddingTop: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    overflowY: "scroll",
  },
  coin: {
    padding: 10,
    borderRadius: 5,
    color: "black",
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EEBC1D",
    boxShadow: "0 0 3px black",
  },
});

export default function UserSidebar() {

  const classes = useStyles();
  const [state, setState] = React.useState({
    right: false,
  });
  const { user, setAlert, watchlist, coins, symbol } = CryptoState();

  // Additional state variables for email notification
  const [alertPrice, setAlertPrice] = useState({}); // Object to store alert prices for each coin (persistent)
 // const [isLess, setIsLess] = useState(false);

  // Fetch initial alert prices from Firestore (assuming a document exists)
  useEffect(() => {
    const getAlertPrices = async () => {
      const coinRef = doc(db, "alertPrices", user.uid);
      const docSnap = await getDoc(coinRef);
      if (docSnap.exists) {
        setAlertPrice(docSnap.data());
      }
    };
    getAlertPrices();
  }, [user.uid]); // Run only once when user changes

  // Save alert prices to Firestore on update
  useEffect(() => {
    const saveAlertPrices = async () => {
      const coinRef = doc(db, "alertPrices", user.uid);
      await setDoc(coinRef, alertPrice, { merge: true });
    };
    saveAlertPrices();
  }, [alertPrice]); // Run whenever alertPrice changes

  // Function to send email notification (optional: move to backend)

    const sendEmailNotification = async (coin) => {
      var data = {
        service_id: 'service_c5933ou',
        template_id: 'template_x0x92yy',
        user_id: 'B20DIFMWguXsvikBD',
        template_params: {
            send_to: user.email,
            coin_name: coin.name,
            coin_currP: coin.current_price,
            alert_price: alertPrice
        }
      };
      try {
        const res = await axios.post("https://api.emailjs.com/api/v1.0/email/send", data);
        console.log(res.data);
      } catch (error) {
        console.error('Error sending email notification:', error);
      }
    };

  const toggleDrawer = (anchor, open) => (event) => {
    if (
      event.type === "keydown" &&
      (event.key === "Tab" || event.key === "Shift")
    ) {
      return;
    }

    setState({ ...state, [anchor]: open });
  };

  const logOut = () => {
    signOut(auth);
    setAlert({
      open: true,
      type: "success",
      message: "Logout Successfull !",
    });

    toggleDrawer();
  };

  const removeFromAlertPrices = async (coinId) => {
    try {
      const coinRef = doc(db, "alertPrices", user.uid);
      const docSnap = await getDoc(coinRef);
      if (docSnap.exists) {
        const alertPricesData = docSnap.data();
        delete alertPricesData[coinId];
        await setDoc(coinRef, alertPricesData);
      }
    } catch (error) {
      console.error("Error removing from alertPrices:", error);
    }
  };

  const removeFromWatchlist = async (coin) => {
    const coinRef = doc(db, "watchlist", user.uid);
    try {
      await setDoc(
        coinRef,
        { coins: watchlist.filter((wish) => wish !== coin?.id) },
        { merge: true },
        removeFromAlertPrices(coin.id)

      );

      setAlert({
        open: true,
        message: `${coin.name} Removed from the Watchlist !`,
        type: "success",
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.message,
        type: "error",
      });
    }
  };


  return (
    <div>
      {["right"].map((anchor) => (
        <React.Fragment key={anchor}>
          <Avatar
            onClick={toggleDrawer(anchor, true)}
            style={{
              height: 38,
              width: 38,
              marginLeft: 15,
              cursor: "pointer",
              backgroundColor: "#EEBC1D",
            }}
            src={user.photoURL}
            alt={user.displayName || user.email}
          />
          <Drawer anchor={anchor} open={state[anchor]} onClose={toggleDrawer(anchor, false)}>
            <div className={classes.container}>
              <div className={classes.profile}>
                <Avatar className={classes.picture} src={user.photoURL} alt={user.displayName || user.email} />
                <span style={{ fontSize: 25, textAlign: "center", fontWeight: "bolder", wordWrap: "break-word" }}>
                  {user.displayName || user.email}
                </span>
                <div className={classes.watchlist}>
                  <span style={{ fontSize: 15, textShadow: "0 0 5px black" }}>Watchlist</span>
                  {coins.map((coin) => {
                    if (watchlist.includes(coin.id))
                      return (
                      <div key={coin.id} className={classes.coin}>
                      <span>{coin.name}</span>
                      <span style={{ display: "flex", gap: 8 }}>
                        {symbol} {numberWithCommas(coin.current_price.toFixed(2))}
                        <TextField
                          variant="standard"
                          label="Set Alert Price"
                          type="number"
                          style={{ width: "50%", marginRight: 5 }}
                          value={alertPrice[coin.id] || ""} // Set default value from alertPrice
                          onChange={(e) => setAlertPrice({ ...alertPrice, [coin.id]: e.target.value })} // Update alertPrice state
                        />
                        {coin.current_price < alertPrice[coin.id] && (
                         sendEmailNotification(coin)
                        )}
                        <AiFillDelete
                          style={{ cursor: "pointer", fontSize: 16 }}
                          onClick={() => removeFromWatchlist(coin)}
                        />
                      </span>
                    </div>
                    );
                    else return <></>;
                        })}
                </div>
              </div>
              <Button variant="contained" className={classes.logout} onClick={logOut}>
                Log Out
              </Button>
            </div>
          </Drawer>
        </React.Fragment>
      ))}
    </div>
  );
                  }

