import { Builder, Browser, By, until, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";

async function openMeet(driver: WebDriver) {
  try {
    await driver.get("http://meet.google.com/nmr-vmup-nak");
    
    try {
      const popupButton = await driver.wait(
        until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')),
        5000
      );
      await popupButton.click();
    } catch (error) {
      console.log("No 'Got it' popup found, proceeding...");
    }
    
    try {
      const nameInput = await driver.wait(
        until.elementLocated(By.xpath('//input[@placeholder="Your name"]')),
        5000
      );
      await nameInput.clear();
      await nameInput.click();
      await nameInput.sendKeys("Surya Ghosh");
      await driver.sleep(1000);
    } catch (error) {
      console.log("No name input required, proceeding...");
    }
    
    try {
      const micButton = await driver.wait(
        until.elementLocated(By.xpath('//div[@role="button" and @aria-label[contains(., "Turn off microphone")]]')),
        5000
      );
      await micButton.click();
      console.log("Microphone turned off.");
    } catch (error) {
      console.log("Microphone button not found or already off.");
    }
    
    try {
      const cameraButton = await driver.wait(
        until.elementLocated(By.xpath('//div[@role="button" and @aria-label[contains(., "Turn off camera")]]')),
        5000
      );
      await cameraButton.click();
      console.log("Camera turned off.");
    } catch (error) {
      console.log("Camera button not found or already off.");
    }
    
    try {
      const joinNowButton = await driver.wait(
        until.elementLocated(By.xpath('//span[contains(text(), "Join now")]')),
        10000
      );
      await joinNowButton.click();
    } catch (error) {
      console.log("'Join now' button not found, trying 'Ask to join'");
      
      const askToJoinButton = await driver.wait(
        until.elementLocated(By.xpath('//span[contains(text(), "Ask to join")]')),
        10000
      );
      if(askToJoinButton) console.log("'Ask to join' button found, clicking it...");
      else console.log("'Ask to join' button not found, exiting...");
    
      await askToJoinButton.click();
    }
  } finally {
    console.log("Meeting join attempt finished");
  }
}

async function getDriver() {
  const options = new Options();
  options.addArguments("--disable-blink-features=AutomationControlled");
  options.addArguments("--use-fake-ui-for-media-stream");
  options.addArguments("--window-size=1080,720");
  options.addArguments("--allow-running-insecure-content");
  
  let driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(options)
    .build();
  return driver;
}

async function main() {
  const driver = await getDriver();
  await openMeet(driver);
  console.log("Meeting joined successfully.");
}

main();
