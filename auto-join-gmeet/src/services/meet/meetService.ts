import { Builder, Browser, By, until, WebDriver, WebElement } from "selenium-webdriver";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";
import { Key } from "selenium-webdriver";

/**
 * Get a WebDriver instance with configured options
 */
export async function getDriver(): Promise<WebDriver> {
  // Use the capabilities approach instead of the Chrome Options
  const capabilities = {
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: [
        "--disable-blink-features=AutomationControlled",
        "--use-fake-ui-for-media-stream", // Auto accept mic/camera permissions
        "--window-size=1080,720",
        "--allow-running-insecure-content"
      ]
    }
  };
  
  let driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .withCapabilities(capabilities)
    .build();
    
  logger.info('WebDriver created');
  return driver;
}

/**
 * Join a Google Meet meeting
 * @param driver WebDriver instance
 * @param meetingUrl URL of the meeting to join
 * @param username Name to display in the meeting
 */
export async function joinMeeting(
  driver: WebDriver, 
  meetingUrl: string = config.meet.defaultMeetingUrl,
  username: string = config.meet.defaultUsername
): Promise<void> {
  try {
    logger.info('Attempting to join meeting', { meetingUrl });
    await driver.get(meetingUrl);
    
    // Handle "Got it" popup if it appears
    try {
      const popupButton = await driver.wait(
        until.elementLocated(By.xpath('//span[contains(text(), "Got it")]')),
        5000
      );
      await popupButton.click();
      logger.debug('Clicked "Got it" popup');
    } catch (error: any) {
      logger.debug('No "Got it" popup found, proceeding...');
    }
    
    // Enter name if prompted
    try {
      const nameInput = await driver.wait(
        until.elementLocated(By.xpath('//input[@placeholder="Your name"]')),
        5000
      );
      await nameInput.clear();
      await nameInput.click();
      await nameInput.sendKeys(username);
      await driver.sleep(1000);
      logger.debug('Entered username', { username });
    } catch (error: any) {
      logger.debug('No name input required, proceeding...');
    }
    
    // Turn off microphone if needed
    try {
      const micButton = await driver.wait(
        until.elementLocated(By.xpath('//div[@role="button" and @aria-label[contains(., "Turn off microphone")]]')),
        5000
      );
      await micButton.click();
      logger.info('Microphone turned off');
    } catch (error: any) {
      logger.debug('Microphone button not found or already off');
    }
    
    // Turn off camera if needed
    try {
      const cameraButton = await driver.wait(
        until.elementLocated(By.xpath('//div[@role="button" and @aria-label[contains(., "Turn off camera")]]')),
        5000
      );
      await cameraButton.click();
      logger.info('Camera turned off');
    } catch (error: any) {
      logger.debug('Camera button not found or already off');
    }
    
    // Join the meeting
    try {
      const joinNowButton = await driver.wait(
        until.elementLocated(By.xpath('//span[contains(text(), "Join now")]')),
        10000
      );
      await joinNowButton.click();
      logger.info('Clicked "Join now" button');
    } catch (error: any) {
      logger.debug('"Join now" button not found, trying "Ask to join"');
      
      try {
        const askToJoinButton = await driver.wait(
          until.elementLocated(By.xpath('//span[contains(text(), "Ask to join")]')),
          10000
        );
        await askToJoinButton.click();
        logger.info('Clicked "Ask to join" button');
      } catch (joinError: any) {
        logger.error('Failed to find join buttons', { error: joinError.message });
        throw new Error('Could not find any join buttons');
      }
    }
    
    logger.info('Meeting join attempt completed');
  } catch (error: any) {
    logger.error('Error joining meeting', { error: error.message });
    throw error;
  }
}

/**
 * Enable captions in the meeting
 */
export async function enableCaptions(driver: WebDriver): Promise<void> {
  try {
    logger.info('Attempting to enable captions');
    
    // Wait for the meeting to fully load
    await driver.sleep(5000);
    
    // Check if captions are already enabled by looking for the caption container
    try {
      const captionsContainerSelectors = [
        '.VYBDae-Bz112c-RLmnJb', // New class provided by the user
        '.VbkSUe' // Old class we were using before
      ];
      
      for (const selector of captionsContainerSelectors) {
        const containers = await driver.findElements(By.css(selector));
        if (containers.length > 0) {
          logger.info('Captions already enabled, container found');
          return; // Exit early if captions are already enabled
        }
      }
    } catch (err) {
      // Continue with enabling captions
    }
    
    // First approach - Try clicking the 3-dot menu
    try {
      // Try different selectors for more options button (UI might vary)
      const moreOptionsSelectors = [
        '//button[contains(@aria-label, "More options")]',
        '//button[contains(@data-tooltip-id, "more-options")]',
        '//button[contains(@data-icon-name, "more")]',
        '//button[contains(@data-tooltip, "More options")]',
        '//div[contains(@role, "button") and contains(@aria-label, "More options")]'
      ];
      
      let moreOptionsButton = null;
      for (const selector of moreOptionsSelectors) {
        try {
          const elements = await driver.findElements(By.xpath(selector));
          if (elements.length > 0) {
            moreOptionsButton = elements[0];
            break;
          }
        } catch (err) {
          // Continue trying other selectors
        }
      }
      
      if (!moreOptionsButton) {
        throw new Error('More options button not found');
      }
      
      await moreOptionsButton.click();
      logger.debug('Clicked more options button');
      
      // Wait for menu to appear
      await driver.sleep(1000);
      
      // Try different selectors for captions option
      const captionsSelectors = [
        '//span[contains(text(), "Turn on captions")]/ancestor::div[@role="menuitem"]',
        '//div[@role="menuitem" and contains(., "Turn on captions")]',
        '//div[@role="menuitem" and contains(., "Captions")]',
        '//span[contains(text(), "Captions")]/ancestor::div[@role="menuitem"]',
        '//div[@role="menuitem"]//span[text()="Turn on captions"]',
        '//div[@role="menuitem"]//span[text()="Captions"]'
      ];
      
      let captionsOption = null;
      for (const selector of captionsSelectors) {
        try {
          const elements = await driver.findElements(By.xpath(selector));
          if (elements.length > 0) {
            captionsOption = elements[0];
            break;
          }
        } catch (err) {
          // Continue trying other selectors
        }
      }
      
      if (!captionsOption) {
        throw new Error('Captions option not found in menu');
      }
      
      await captionsOption.click();
      logger.info('Captions enabled via menu option');
      
    } catch (menuError: any) {
      // Second approach - Try keyboard shortcut (c key)
      logger.debug('Menu approach failed, trying keyboard shortcut', { error: menuError.message });
      try {
        // Focus on the meeting area
        const meetingArea = await driver.findElement(By.tagName('body'));
        await meetingArea.click();
        
        // Use keyboard shortcut (c key) to toggle captions
        await meetingArea.sendKeys('c');
        logger.info('Captions toggled with keyboard shortcut');
        
      } catch (keyError: any) {
        // Third approach - Try direct CC button if it exists
        logger.debug('Keyboard shortcut failed, trying direct CC button', { error: keyError.message });
        try {
          const ccButtonSelectors = [
            '//button[contains(@aria-label, "captions")]',
            '//div[@role="button" and contains(@aria-label, "captions")]',
            '//button[.//div//*[local-name()="svg" and contains(@class, "caption")]]',
            '//div[contains(@class, "VYBDae-Bz112c")]//button', // Using partial class name from user's input
            '//div[@role="button" and contains(@data-tooltip, "captions")]',
            '//div[@role="button" and contains(@data-tooltip, "Captions")]'
          ];
          
          let ccButton = null;
          for (const selector of ccButtonSelectors) {
            try {
              const elements = await driver.findElements(By.xpath(selector));
              if (elements.length > 0) {
                ccButton = elements[0];
                break;
              }
            } catch (err) {
              // Continue trying other selectors
            }
          }
          
          if (!ccButton) {
            throw new Error('CC button not found');
          }
          
          await ccButton.click();
          logger.info('Captions enabled via CC button');
          
        } catch (ccError: any) {
          throw new Error(`Failed to enable captions: ${ccError.message}`);
        }
      }
    }
    
    // Wait for captions to initialize
    await driver.sleep(3000);
    
    // Verify captions are enabled by checking for caption container
    try {
      // Try both the new class and the old class
      const captionsContainerSelectors = [
        '.VYBDae-Bz112c-RLmnJb', // New class provided by the user
        '.VbkSUe' // Old class we were using before
      ];
      
      let captionsFound = false;
      for (const selector of captionsContainerSelectors) {
        const containers = await driver.findElements(By.css(selector));
        if (containers.length > 0) {
          captionsFound = true;
          logger.info(`Caption container found with selector ${selector}, captions are working`);
          break;
        }
      }
      
      if (!captionsFound) {
        logger.warn('Caption container not found after enabling captions');
      }
    } catch (error: any) {
      logger.warn('Could not verify caption status', { error: error.message });
    }
    
  } catch (error: any) {
    logger.error('Error enabling captions', { error: error.message });
    // Don't throw error here to allow the bot to continue even without captions
    logger.warn('Continuing without captions');
  }
}

/**
 * Toggle microphone status
 * @param driver WebDriver instance
 * @param turnOn Whether to turn the microphone on (true) or off (false)
 */
export async function toggleMicrophone(driver: WebDriver, turnOn: boolean): Promise<boolean> {
  try {
    // First, check current microphone status
    const micButtonSelectors = [
      // When mic is on, button will have "Turn off microphone" label
      '//div[@role="button" and @aria-label[contains(., "Turn off microphone")]]',
      // When mic is off, button will have "Turn on microphone" label
      '//div[@role="button" and @aria-label[contains(., "Turn on microphone")]]',
      // Alternate selectors
      '//button[contains(@data-is-muted, "false")]',
      '//button[contains(@data-is-muted, "true")]'
    ];
    
    // Find any mic button
    let micButton: WebElement | null = null;
    let currentlyOn = false;
    
    for (const selector of micButtonSelectors) {
      try {
        const elements = await driver.findElements(By.xpath(selector));
        if (elements.length > 0) {
          micButton = elements[0];
          // If we found a "Turn off" button, mic is currently on
          currentlyOn = selector.includes("Turn off") || selector.includes("false");
          break;
        }
      } catch (err) {
        // Continue trying other selectors
      }
    }
    
    // If button not found, we can't toggle
    if (!micButton) {
      logger.warn('Microphone button not found');
      return false;
    }
    
    // Only click if we're changing state (not already in desired state)
    if (turnOn !== currentlyOn) {
      await micButton.click();
      logger.info(turnOn ? 'Microphone turned on' : 'Microphone turned off');
      
      // Verify the change happened
      await driver.sleep(500);
      return await isMicrophoneOn(driver);
    } else {
      // Already in desired state
      logger.debug(`Microphone already ${turnOn ? 'on' : 'off'}`);
      return currentlyOn;
    }
  } catch (error: any) {
    logger.error('Error toggling microphone', { error: error.message });
    return false;
  }
}

/**
 * Check if the microphone is currently on
 */
export async function isMicrophoneOn(driver: WebDriver): Promise<boolean> {
  try {
    // When mic is on, button will have "Turn off microphone" label
    const micOffButtonElements = await driver.findElements(
      By.xpath('//div[@role="button" and @aria-label[contains(., "Turn off microphone")]]')
    );
    
    // If we find a "Turn off" button, mic is currently on
    return micOffButtonElements.length > 0;
  } catch (error: any) {
    logger.error('Error checking microphone status', { error: error.message });
    return false;
  }
}

/**
 * Send a text message in the meeting chat
 * @param driver WebDriver instance
 * @param message Message to send
 */
export async function sendChatMessage(driver: WebDriver, message: string): Promise<boolean> {
  try {
    // First, open the chat panel if it's not already open
    try {
      // Look for chat button using various possible selectors
      const chatButtonSelectors = [
        '//button[contains(@aria-label, "Chat with everyone")]',
        '//div[@role="button" and contains(@aria-label, "Chat")]',
        '//button[contains(@data-tooltip, "Chat")]',
        '//button[contains(@data-tab-id, "chat")]'
      ];
      
      let chatButton: WebElement | null = null;
      for (const selector of chatButtonSelectors) {
        const elements = await driver.findElements(By.xpath(selector));
        if (elements.length > 0) {
          chatButton = elements[0];
          break;
        }
      }
      
      if (chatButton) {
        await chatButton.click();
        logger.debug('Clicked chat button');
        
        // Wait for chat to open
        await driver.sleep(1000);
      } else {
        logger.warn('Chat button not found');
      }
    } catch (error: any) {
      logger.warn('Error opening chat panel', { error: error.message });
    }
    
    // Now find the chat input field
    const chatInputSelectors = [
      '//textarea[@aria-label="Send a message to everyone"]',
      '//textarea[contains(@placeholder, "Send a message")]',
      '//div[@role="textbox" and contains(@aria-label, "chat")]'
    ];
    
    let chatInput: WebElement | null = null;
    for (const selector of chatInputSelectors) {
      try {
        const elements = await driver.findElements(By.xpath(selector));
        if (elements.length > 0) {
          chatInput = elements[0];
          break;
        }
      } catch (err) {
        // Continue trying other selectors
      }
    }
    
    if (!chatInput) {
      logger.warn('Chat input field not found');
      return false;
    }
    
    // Type the message and send it
    await chatInput.click();
    await chatInput.clear();
    await chatInput.sendKeys(message);
    await chatInput.sendKeys(Key.RETURN);
    
    logger.info('Sent chat message', { message });
    return true;
  } catch (error: any) {
    logger.error('Error sending chat message', { error: error.message });
    return false;
  }
}

/**
 * Speak text using the microphone
 * @param driver WebDriver instance
 * @param text Text to speak
 */
export async function speakInMeeting(driver: WebDriver, text: string): Promise<boolean> {
  try {
    // First make sure microphone is on
    const micOn = await toggleMicrophone(driver, true);
    if (!micOn) {
      logger.error('Failed to turn on microphone for speaking');
      // Fall back to sending chat message
      return await sendChatMessage(driver, text);
    }
    
    // Log what the bot is saying
    logger.info('BOT SPEAKING', { text });
    
    // Wait for a bit to simulate speaking (in a real implementation, you'd use 
    // text-to-speech and actually speak through the microphone)
    const speakingTimeMs = text.length * 80; // Rough estimate of speaking time
    await driver.sleep(speakingTimeMs);
    
    // Turn microphone off after speaking
    await toggleMicrophone(driver, false);
    
    return true;
  } catch (error: any) {
    logger.error('Error speaking in meeting', { error: error.message });
    return false;
  }
}

/**
 * Leave the current Google Meet meeting
 * @param driver WebDriver instance
 */
export async function leaveMeeting(driver: WebDriver): Promise<void> {
  try {
    logger.info('Attempting to leave meeting');
    
    // Click on the leave meeting button
    const leaveButtonSelectors = [
      // Various selectors for the leave meeting button
      '//div[@aria-label="Leave call"]',
      '//button[@aria-label="Leave call"]',
      '//div[@jsname="CQylAd"]',
      '//button[contains(@data-is-muted, "leaveCall")]',
      '[data-tooltip-id="tt-c25"] > div',
      '.zgm6R'
    ];
    
    let buttonFound = false;
    for (const selector of leaveButtonSelectors) {
      try {
        const elements = await driver.findElements(selector.startsWith('//') ? By.xpath(selector) : By.css(selector));
        if (elements.length > 0) {
          await elements[0].click();
          buttonFound = true;
          logger.info('Clicked leave meeting button');
          await driver.sleep(1000);
          break;
        }
      } catch (err) {
        // Continue trying other selectors
      }
    }
    
    if (!buttonFound) {
      // If we couldn't find a leave button, just close the browser window
      logger.warn('Could not find leave button, closing window');
    }
    
    // After leaving, wait a moment for any confirm dialogs
    await driver.sleep(1000);
    
    // Check for confirmation dialog to leave and click it if present
    try {
      const confirmButtonSelectors = [
        '//span[contains(text(), "Leave")]//ancestor::button',
        '//button[contains(., "Leave meeting")]',
        '//button[contains(@jsname, "leave")]'
      ];
      
      for (const selector of confirmButtonSelectors) {
        const buttons = await driver.findElements(By.xpath(selector));
        if (buttons.length > 0) {
          await buttons[0].click();
          logger.info('Clicked leave confirmation button');
          break;
        }
      }
    } catch (error) {
      logger.debug('No confirmation dialog found');
    }
    
    logger.info('Successfully left meeting');
  } catch (error: any) {
    logger.error('Error leaving meeting', { error: error.message });
    throw error;
  }
} 