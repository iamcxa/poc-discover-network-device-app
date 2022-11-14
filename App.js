import React, { useEffect } from 'react';

import _ from 'lodash';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  ScrollView,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import Zeroconf from 'react-native-zeroconf';
import Ping from 'react-native-ping';

require('events').defaultMaxListeners = 500;

const zeroconf = new Zeroconf();

const sleep = (time) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });

let timer = null;

export default function App() {
  const netInfo = useNetInfo();
  const [ipAddresses, setIpAddresses] = React.useState([]);
  const [scanningIp, setScanningIp] = React.useState(null);

  const [mdnsDevices, setMdnsDevices] = React.useState([]);
  const [scanningMdns, setScanningMdns] = React.useState(null);

  const handlePing = async (ip, timeout = 100) => {
    const option = { timeout };
    let ms;
    try {
      ms = await Ping.start(ip, option);
      console.log('ping: ', ip, ms);

      return ms;
    } catch (error) {
      console.log(error.code, error.message);
      return false;
    }
  };

  const handleButtonPress = async () => {
    const myIp = netInfo?.details?.ipAddress;

    setIpAddresses([]);
    setScanningIp(null);

    if (myIp) {
      const myIpSet = myIp.split('.');
      const myLastIpSlot = _.last(myIpSet);
      const possibleIpArray = Array.from(
        { length: 255 },
        (_, i) => i + 1,
      ).filter((e) => e !== myLastIpSlot);
      myIpSet.pop();

      for await (const ip of possibleIpArray) {
        const targetIp = `${myIpSet.join('.')}.${ip}`;
        setScanningIp(targetIp);
        const ms = await handlePing(targetIp);
        if (ms) {
          setIpAddresses((curIpAddresses) => curIpAddresses.concat(targetIp));
        }
      }
      setScanningIp(null);
    }
  };

  const handleScanMdns = async (
    type = 'http',
    protocol = 'tcp',
    domain = 'local.',
  ) => {
    console.log('zeroconf=>', zeroconf.scan);
    timer = null;
    clearTimeout(timer);
    timer = setTimeout(() => {
      zeroconf.stop();
    }, 5000);
    zeroconf.scan((type = 'http'), (protocol = 'tcp'), (domain = 'local.'));
  };

  zeroconf.on('start', () => {
    console.log('[Start]');
    setMdnsDevices([]);
    setScanningMdns(true);
  });

  zeroconf.on('stop', () => {
    console.log('[Stop]');
    setScanningMdns(false);
  });

  zeroconf.on('resolved', (service) => {
    console.log('[Resolve]', JSON.stringify(service, null, 2));
    setMdnsDevices((devices) => devices.concat(service));
  });

  zeroconf.on('error', (err) => {
    console.log('[Error]', err);
    Alert.alert('Mdns error', JSON.stringify(err, null, 2));
  });

  useEffect(() => {}, []);

  return (
    <View style={styles.container}>
      <StatusBar style='auto' />

      <View style={[styles.container, { flex: 0.45 }]}>
        <Text>Network Type: {netInfo.type}</Text>
        <Text>{JSON.stringify(netInfo, null, 2)}</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.columnStart}>
            <Text>Available Ip Addresses:</Text>
            <View style={styles.columnCenter}>
              {ipAddresses ? (
                ipAddresses.map((e) => (
                  <Text style={styles.txtItem} key={e}>
                    {e}
                  </Text>
                ))
              ) : (
                <Text>None</Text>
              )}
            </View>

            {scanningIp && (
              <View>
                <Text>Scanning:</Text>
                <Text>{scanningIp}</Text>
              </View>
            )}
          </View>

          <View style={styles.hrLine}></View>

          <View style={styles.columnStart}>
            <Text>Available Mdns deivces:</Text>
            <View style={styles.columnCenter}>
              {mdnsDevices ? (
                _.uniqBy(mdnsDevices, 'fullName')
                .map((e, i) => (
                  <Text style={styles.txtItem} key={i}>
                    {e.host}
                  </Text>
                ))
              ) : (
                <Text>None</Text>
              )}
            </View>
            {scanningMdns && (
              <View>
                <Text>Scanning Mdns devices....</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.row,
          {
            flex: 0.1,
            // flex: ,
            // alignItems: 'center',
            alignContent: 'space-around',
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Button
            disabled={netInfo.type !== 'wifi' || scanningMdns || scanningIp}
            onPress={handleButtonPress}
            title='Scan IPs'
            color='#841584'
          />
        </View>

        <View style={{ flex: 1 }}>
          <Button
            disabled={netInfo.type !== 'wifi' || scanningIp}
            onPress={handleScanMdns}
            title='Scan Mdns'
            color='#841584'
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
  },
  columnStart: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignContent: 'center',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  txtItem: {
    color: 'gray',
  },
  hrLine: {
    borderColor: 'gray',
    borderWidth: 0.5,
  },
});
