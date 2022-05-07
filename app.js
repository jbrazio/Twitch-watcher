/* eslint-disable no-use-before-define */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */

require('dotenv').config();

const puppeteer = require('puppeteer-core');
const dayjs = require('dayjs');
const cheerio = require('cheerio');
const fs = require('fs');
const treekill = require('tree-kill');
const inquirer = require('./input');

let run = true;
let firstRun = true;
let cookie = null;
let streamers = null;

// CONFIG SECTION =================================================================
const configPath = './config.json';
const screenshotFolder = './screenshots/';
const baseUrl = 'https://www.twitch.tv/';

const drops = 'drops/inventory';

const userAgent = process.env.userAgent
    || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36';

const streamersUrl = process.env.streamersUrl
    || 'https://www.twitch.tv/directory/game/Rust?sort=VIEWER_COUNT&tl=c2542d6d-cd10-4532-919b-3d19f30a768b';

const scrollDelay = Number(process.env.scrollDelay)
  || getRandomInt(1, 6) * 1000;

const scrollTimes = Number(process.env.scrollTimes)
  || getRandomInt(2, 8);

const minWatching = Number(process.env.minWatching)
  || getRandomInt(5, 15); // Minutes

const maxWatching = Number(process.env.maxWatching)
  || getRandomInt(15, 30); // Minutes

const noChannelFoundWait = Number(process.env.noChannelFoundWait)
  || getRandomInt(2, 15); // Minutes

const streamerListRefresh = Number(process.env.streamerListRefresh)
  || getRandomInt(15, 90);

const streamerListRefreshUnit = process.env.streamerListRefreshUnit
  || 'minute'; // https://day.js.org/docs/en/manipulate/add

const checkForDrops = (process.env.checkForDrops === 'true') || false;
const browserScreenshot = (process.env.browserScreenshot === 'true') || false;
const watchAlwaysTopStreamer = (process.env.watchAlwaysTopStreamer === 'true') || false;
const channelsWithPriority = process.env.channelsWithPriority ? process.env.channelsWithPriority.toLowerCase().split(',') : [];

const showBrowser = false; // false state equ headless mode;
const proxy = process.env.proxy || ''; // "ip:port" By https://github.com/Jan710
const proxyAuth = process.env.proxyAuth || '';

const browserClean = getRandomInt(30, 180);
const browserCleanUnit = 'minute';

const browserConfig = {
  headless: !showBrowser,
  args: [
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
}; // https://github.com/D3vl0per/Valorant-watcher/issues/24

const cookiePolicyQuery = 'button[data-a-target="consent-banner-accept"]';
const matureContentQuery = 'button[data-a-target="player-overlay-mature-accept"]';
const sidebarQuery = '*[data-test-selector="user-menu__toggle"]';
const userStatusQuery = 'span[data-a-target="presence-text"]';
const channelsQuery = 'a[data-test-selector*="ChannelLink"]';
const streamPauseQuery = 'button[data-a-target="player-play-pause-button"]';
const streamSettingsQuery = '[data-a-target="player-settings-button"]';
const streamQualitySettingQuery = '[data-a-target="player-settings-menu-item-quality"]';
const streamQualityQuery = 'input[data-a-target="tw-radio"]';
const ClaimDropQuery = 'button[data-test-selector="DropsCampaignInProgressRewardPresentation-claim-button"]';

// CONFIG SECTION =================================================================

async function viewRandomPage(browser, page) {
  let streamer_last_refresh = dayjs().add(
    streamerListRefresh,
    streamerListRefreshUnit,
  );
  let browser_last_refresh = dayjs().add(browserClean, browserCleanUnit);
  while (run) {
    try {
      if (dayjs(browser_last_refresh).isBefore(dayjs())) {
        const newSpawn = await cleanup(browser, page);
        browser = newSpawn.browser;
        page = newSpawn.page;
        firstRun = true;
        browser_last_refresh = dayjs().add(
          browserClean,
          browserCleanUnit,
        );
      }

      if (dayjs(streamer_last_refresh).isBefore(dayjs())) {
        await getAllStreamer(page); // Call getAllStreamer function and refresh the list
        streamer_last_refresh = dayjs().add(
          streamerListRefresh,
          streamerListRefreshUnit,
        ); // https://github.com/D3vl0per/Valorant-watcher/issues/25
      }

      let watch;

      if (watchAlwaysTopStreamer) {
        watch = streamers[0];
        console.log(`Top streamer is ${streamers[0]}`);
      } else {
        watch = streamers[getRandomInt(0, streamers.length - 1)]; // https://github.com/D3vl0per/Valorant-watcher/issues/27
      }

      if (channelsWithPriority.length > 0) {
        for (let i = 0; i < channelsWithPriority.length; i++) {
          if (streamers.includes(channelsWithPriority[i])) {
            watch = channelsWithPriority[i];
            break;
          }
        }
      }

      if (!watch) {
        console.log(
          `❌ No channels available, retrying in ${noChannelFoundWait} minutes...`,
        );
        await page.waitFor(noChannelFoundWait * 60 * 1000);
      } else {
        const sleep = getRandomInt(minWatching, maxWatching) * 60000; // Set watching timer

        console.log('\n🔗 Now watching streamer: ', baseUrl + watch);

        await page.goto(baseUrl + watch, {
          waitUntil: 'networkidle2',
        }); // https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#pagegobackoptions
        console.log('✅ Stream loaded!');
        await clickWhenExist(page, cookiePolicyQuery);
        await clickWhenExist(page, matureContentQuery); // Click on accept button

        if (firstRun) {
          console.log('🔧 Setting lowest possible resolution..');
          await clickWhenExist(page, streamPauseQuery);

          await clickWhenExist(page, streamSettingsQuery);
          await page.waitFor(streamQualitySettingQuery);

          await clickWhenExist(page, streamQualitySettingQuery);
          await page.waitFor(streamQualityQuery);

          let resolution = await queryOnWebsite(
            page,
            streamQualityQuery,
          );
          resolution = resolution[resolution.length - 1].attribs.id;
          await page.evaluate((resolution) => {
            document.getElementById(resolution).click();
          }, resolution);

          await clickWhenExist(page, streamPauseQuery);

          await page.keyboard.press('m'); // For unmute
          firstRun = false;
        }

        if (browserScreenshot) {
          await page.waitFor(1000);
          fs.access(screenshotFolder, (error) => {
            if (error) {
              fs.promises.mkdir(screenshotFolder);
            }
          });
          await page.screenshot({
            path: `${screenshotFolder}${watch}.png`,
          });
          console.log(`📸 Screenshot created: ${watch}.png`);
        }

        await clickWhenExist(page, sidebarQuery); // Open sidebar
        await page.waitFor(userStatusQuery); // Waiting for sidebar
        const status = await queryOnWebsite(page, userStatusQuery); // status jQuery
        await clickWhenExist(page, sidebarQuery); // Close sidebar

        console.log(
          '💡 Account status:',
          status[0] ? status[0].children[0].data : 'Unknown',
        );
        console.log(`🕒 Time: ${dayjs().format('HH:mm:ss')}`);
        console.log(
          `💤 Watching stream for ${sleep / 60000} minutes\n`,
        );

        await page.waitFor(sleep);
        if (checkForDrops) {
          await claimDropsIfAny(page);
        }
      }
    } catch (e) {
      console.log('🤬 Error: ', e);
      console.log(
        'Please visit the discord channel to receive help: https://discord.gg/s8AH4aZ',
      );
    }
  }
}

async function claimDropsIfAny(page) {
  console.log('🔎 Checking for drops...');

  await page.goto(baseUrl + drops, {
    waitUntil: ['networkidle2', 'domcontentloaded'],
  });

  if (channelsWithPriority.length > 0) {
    const claimed = await queryOnWebsite(
      page,
      'p[data-test-selector="awarded-drop__drop-name"]',
    );

    if (claimed.length > 0) {
      console.log('🎬 Watch list: ', channelsWithPriority);
      for (let i = 0; i < 10; i++) {
        const username = claimed[i].children[0].data.split(' ')[0].toLowerCase();
        if (channelsWithPriority.includes(username)) {
          channelsWithPriority.splice(channelsWithPriority.indexOf(username), 1);
        }
      }
      console.log('🧹 Filtered Watch list: ', channelsWithPriority);
    }
  }

  const claimButtons = (await page.$$(ClaimDropQuery));
  console.log(`🔎 Found ${claimButtons.length} unclaimed drops`);

  // eslint-disable-next-line no-restricted-syntax
  for (const claimButton of claimButtons) {
    console.log('💾 Claiming drop..');
    await Promise.all([
      new Promise((resolve) => { setTimeout(resolve, 1000); }),
      claimButton.click(),
      new Promise((resolve) => { setTimeout(resolve, 1000); }),
    ]);
  }
}

async function readLoginData() {
  const cookie = [
    {
      domain: '.twitch.tv',
      hostOnly: false,
      httpOnly: false,
      name: 'auth-token',
      path: '/',
      sameSite: 'no_restriction',
      secure: true,
      session: false,
      storeId: '0',
      id: 1,
    },
  ];
  try {
    console.log('🔎 Checking config file...');

    if (fs.existsSync(configPath)) {
      console.log('✅ Json config found!');

      const configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (proxy) browserConfig.args.push(`--proxy-server=${proxy}`);
      browserConfig.executablePath = configFile.exec;
      cookie[0].value = configFile.token;

      return cookie;
    }

    if (process.env.token) {
      console.log('✅ Env config found');

      if (proxy) browserConfig.args.push(`--proxy-server=${proxy}`);
      cookie[0].value = process.env.token; // Set cookie from env
      browserConfig.executablePath = '/usr/bin/chromium-browser'; // For docker container

      return cookie;
    }

    console.log('❌ No config file found!');

    const input = await inquirer.askLogin();

    fs.writeFile(configPath, JSON.stringify(input), (err) => {
      if (err) {
        console.log(err);
      }
    });

    if (proxy) browserConfig.args[6] = `--proxy-server=${proxy}`;
    browserConfig.executablePath = input.exec;
    cookie[0].value = input.token;

    return cookie;
  } catch (err) {
    console.log('🤬 Error: ', e);
    console.log(
      'Please visit my discord channel to solve this problem: https://discord.gg/s8AH4aZ',
    );
  }
}

async function spawnBrowser() {
  console.log('=========================');
  console.log('📱 Launching browser...');
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();

  console.log(`🔧 Setting User-Agent...\n ${userAgent} `);
  await page.setUserAgent(userAgent); // Set userAgent

  console.log('🔧 Setting auth token...');
  await page.setCookie(...cookie); // Set cookie

  console.log('⏰ Setting timeouts...');
  await page.setDefaultNavigationTimeout(process.env.timeout || 0);
  await page.setDefaultTimeout(process.env.timeout || 0);

  if (proxyAuth) {
    await page.setExtraHTTPHeaders({
      'Proxy-Authorization': `Basic ${Buffer.from(proxyAuth).toString(
        'base64',
      )}`,
    });
  }

  return {
    browser,
    page,
  };
}

async function getAllStreamer(page) {
  console.log('=========================');
  await page.goto(streamersUrl, {
    waitUntil: 'networkidle0',
  });
  console.log('🔐 Checking login...');
  await checkLogin(page);
  console.log('📡 Checking active streamers...');
  await scroll(page, scrollTimes);
  const jquery = await queryOnWebsite(page, channelsQuery);
  streamers = null;
  streamers = new Array();

  console.log('🧹 Filtering out html codes...');
  for (let i = 0; i < jquery.length; i++) {
    streamers[i] = jquery[i].attribs.href.split('/')[1];
  }
}

async function checkLogin(page) {
  const cookieSetByServer = await page.cookies();
  for (let i = 0; i < cookieSetByServer.length; i++) {
    if (cookieSetByServer[i].name === 'twilight-user') {
      console.log('✅ Login successful!');
      return true;
    }
  }
  console.log('🛑 Login failed!');
  console.log('🔑 Invalid token!');
  console.log(
    '\n',
    'Please ensure that you have a valid twitch auth-token.\n',
    'https://github.com/D3vl0per/Valorant-watcher#how-token-does-it-look-like',
  );
  if (!process.env.token) {
    fs.unlinkSync(configPath);
  }
  process.exit();
}

async function scroll(page, times) {
  console.log('🔨 Emulating scrolling...');

  for (let i = 0; i < times; i++) {
    await page.evaluate(async (page) => {
      const x = document.getElementsByClassName(
        'scrollable-trigger__wrapper',
      );
      if (x.length > 0) {
        // there will be no scroll if there are no active streams
        x[0].scrollIntoView();
      }
    });
    await page.waitFor(scrollDelay);
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function clickWhenExist(page, query) {
  const result = await queryOnWebsite(page, query);

  try {
    if (result[0].type === 'tag' && result[0].name === 'button') {
      await page.click(query);
      await page.waitFor(500);
    }
  } catch (e) {}
}

async function queryOnWebsite(page, query) {
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  const $ = cheerio.load(bodyHTML);
  const jquery = $(query);
  return jquery;
}

async function cleanup(browser, page) {
  const pages = await browser.pages();
  await pages.map((page) => page.close());
  await treekill(browser.process().pid, 'SIGKILL');
  // await browser.close();
  return await spawnBrowser();
}

async function killBrowser(browser, page) {
  const pages = await browser.pages();
  await pages.map((page) => page.close());
  treekill(browser.process().pid, 'SIGKILL');
}

async function shutDown() {
  console.log('\n👋Bye Bye👋');
  run = false;
  process.exit();
}

async function main() {
  console.clear();
  console.log('=========================');
  cookie = await readLoginData();

  const { browser, page } = await spawnBrowser();

  if (checkForDrops) {
    await claimDropsIfAny(page);
  }

  await getAllStreamer(page);
  console.log('=========================');
  console.log('🔭 Running watcher...');
  await viewRandomPage(browser, page);
}

main();

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
