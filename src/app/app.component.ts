import { Component, ElementRef, ViewChild, HostListener, NgZone, OnDestroy } from '@angular/core';
import { ChromeExtensionService } from './chrome-extension.service';
import * as XLSX from 'xlsx';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from '@angular/material/button';
import { MatChipEditedEvent, MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatRadioModule } from '@angular/material/radio';
import { ExcelService } from './excel.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';

interface StorageData {
  allContactData: any[];
  allGroupData: any[];
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, FormsModule, MatInputModule, MatSelectModule, MatFormFieldModule, MatButtonModule,
    MatChipsModule, MatIconModule, MatRadioModule, MatCheckboxModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  myForm: FormGroup;
  loginStatus: boolean = false;
  sheetHeaders: any;
  sheetData: any;
  searchFields: any
  countriesData: any[] = [];
  selectedCountry: any;
  attachmentArray: any[] = [];
  excelMsgArray: any[] = [];
  phoneNumbersArray: any[] = [];
  readonly separatorKeysCodes = [ENTER, COMMA] as const; // Define separators (Enter, Comma)
  addOnBlur = true;
  allGroupData: any[] = [];
  allContactData: any[] = [];
  selectedOption: any = '1';
  whatsappGroupArray: any[] = [];

  selectedContacts: any[] = [];
  filteredContacts: any[] = [];
  showDropdown = false;
  clickedInside = false;
  sheetSelectedFlag: boolean = false;
  isProcessing: boolean = false;
  statusText: string | null = null;
  private statusTimer: any = null;
  private pendingCountryCode: string | null = null;

  constructor(private chromeService: ChromeExtensionService, private excelService: ExcelService, private ngZone: NgZone) {
    this.myForm = new FormGroup({
      country: new FormControl(this.countriesData.find(country => country.code === 'IN')),
      phone: new FormControl(''),
      message: new FormControl(''),
      search: new FormControl(''),
      msgTimeGap: new FormControl(''),
      batch: new FormControl(''),
      batchTimeGap: new FormControl(''),
      header: new FormControl([])
    });
    this.filteredContacts = [...this.allContactData];
    // Update filtered contacts when the search value changes
    this.myForm.get('search')?.valueChanges.subscribe(() => {
      this.filterContacts();
    });
  }

  async ngOnInit() {
    this.chromeService.getCountries().subscribe((data) => {
      this.countriesData = data;
      this.setDefaultCountry();
      this.applyPendingCountry();
    });

    await this.loadAttachmentsFromStorage();

    // Check if there is an open WhatsApp Web tab
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, function (tabs) {
      if (tabs.length > 0) {
        // If WhatsApp Web is already open, activate that tab and reload it
        // chrome.tabs.update(Number(tabs[0].id), { active: true }, function () {
        //     chrome.tabs.reload(tabs[0].id);
        // });
      } else {
        // Else open a new WhatsApp Web tab
        chrome.tabs.create({ url: "https://web.whatsapp.com/" });
      }
    });

    try {
      // Retrieve data from chrome.storage.local
      const data = await this.chromeService.get<StorageData>('allGroupData');
      if (data) {
        this.allGroupData = data.allGroupData as any[];
      }
    } catch (error) {
      console.error('Error retrieving group data:', error);
    }

    try {
      // Retrieve data from chrome.storage.local
      const data = await this.chromeService.get<StorageData>('allContactData');
      if (data) {
        this.allContactData = data.allContactData as any[];
        this.allContactData.sort((a, b) => a.name.localeCompare(b.name));
        this.filteredContacts = [...this.allContactData];
        this.rebuildFilteredContacts();
      }
    } catch (error) {
      console.error('Error retrieving group data:', error);
    }

    await this.loadPersistedState();

    // Listen for completion signal from content script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message: any) => {
        if (message?.type === 'SEND_ALL_COMPLETE') {
          this.ngZone.run(() => {
            this.isProcessing = false;
            this.statusText = 'Messages sent successfully';

            if (this.statusTimer) {
              clearTimeout(this.statusTimer);
            }
            this.clearStateAfterSend();
            this.statusTimer = setTimeout(() => {
              this.ngZone.run(() => {
                this.statusText = null;
              });
            }, 10000); // Hide after 10 seconds
          });
        }
      });
    }

    this.myForm.valueChanges.subscribe(() => {
      this.persistState();
    });
  }

  ngOnDestroy(): void {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
  }

  onCountrySelect(event: any): void {
    this.selectedCountry = event.value;
    this.persistState();
  }

  addPhoneNumber(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add the number if it is valid and not already added
    if (value && !this.phoneNumbersArray.includes(value)) {
      this.phoneNumbersArray.push(value);
      this.persistState();
    }

    // Clear the input field
    event.chipInput!.clear();
  }

  removePhoneNumber(index: number): void {
    if (index >= 0) {
      this.phoneNumbersArray.splice(index, 1); // Remove the number
      this.persistState();
    }
  }


  setDefaultCountry() {
    const defaultCountry = this.countriesData.find(country => country.code === 'IN');
    if (defaultCountry) {
      this.myForm.get('country')?.setValue(defaultCountry);
    }
  }

  private applyPendingCountry() {
    if (this.pendingCountryCode && this.countriesData && this.countriesData.length > 0) {
      const match = this.countriesData.find(country => country.code === this.pendingCountryCode);
      if (match) {
        this.myForm.get('country')?.setValue(match);
      }
      this.pendingCountryCode = null;
    }
  }

  private async loadAttachmentsFromStorage() {
    try {
      const data = await this.chromeService.get<{ attachmentsData: any[] }>('attachmentsData');
      if (data && (data as any).attachmentsData) {
        this.attachmentArray = (data as any).attachmentsData || [];
      }
    } catch (error) {
      console.error('Error loading attachments from storage:', error);
    }
  }

  private async loadPersistedState() {
    try {
      const savedWrapper = await this.chromeService.get<any>('popupState');
      const saved = savedWrapper?.popupState || savedWrapper;
      if (!saved || Object.keys(saved).length === 0) {
        return;
      }

      this.selectedOption = saved.selectedOption ?? this.selectedOption;
      this.phoneNumbersArray = Array.isArray(saved.phoneNumbersArray) ? saved.phoneNumbersArray : this.phoneNumbersArray;
      this.whatsappGroupArray = Array.isArray(saved.whatsappGroupArray) ? saved.whatsappGroupArray : this.whatsappGroupArray;
      this.selectedContacts = Array.isArray(saved.selectedContacts) ? saved.selectedContacts : this.selectedContacts;
      this.sheetHeaders = saved.sheetHeaders ?? this.sheetHeaders;
      this.sheetData = saved.sheetData ?? this.sheetData;
      this.sheetSelectedFlag = saved.sheetSelectedFlag ?? this.sheetSelectedFlag;
      this.excelMsgArray = saved.excelMsgArray ?? this.excelMsgArray;

      if (saved.message !== undefined) {
        this.myForm.get('message')?.setValue(saved.message);
      }
      if (saved.msgTimeGap !== undefined) {
        this.myForm.get('msgTimeGap')?.setValue(saved.msgTimeGap);
      }
      if (saved.batch !== undefined) {
        this.myForm.get('batch')?.setValue(saved.batch);
      }
      if (saved.batchTimeGap !== undefined) {
        this.myForm.get('batchTimeGap')?.setValue(saved.batchTimeGap);
      }
      if (saved.countryCode) {
        this.pendingCountryCode = saved.countryCode;
        this.applyPendingCountry();
      }

      this.rebuildFilteredContacts();
    } catch (error) {
      console.error('Error loading popup state:', error);
    }
  }

  private rebuildFilteredContacts() {
    if (this.allContactData && this.allContactData.length > 0) {
      const selectedIds = new Set(this.selectedContacts.map((c: any) => c?.id?._serialized));
      this.filteredContacts = this.allContactData.filter((c: any) => !selectedIds.has(c?.id?._serialized));
    }
  }

  private async persistState() {
    try {
      const country = this.myForm.get('country')?.value;
      const popupState = {
        selectedOption: this.selectedOption,
        phoneNumbersArray: this.phoneNumbersArray,
        whatsappGroupArray: this.whatsappGroupArray,
        selectedContacts: this.selectedContacts,
        message: this.myForm.get('message')?.value,
        msgTimeGap: this.myForm.get('msgTimeGap')?.value,
        batch: this.myForm.get('batch')?.value,
        batchTimeGap: this.myForm.get('batchTimeGap')?.value,
        countryCode: country?.code,
        sheetHeaders: this.sheetHeaders,
        sheetData: this.sheetData,
        sheetSelectedFlag: this.sheetSelectedFlag,
        excelMsgArray: this.excelMsgArray
      };
      await this.chromeService.set('popupState', popupState);
    } catch (error) {
      console.error('Error persisting popup state:', error);
    }
  }

  private async clearStateAfterSend() {
    this.phoneNumbersArray = [];
    this.whatsappGroupArray = [];
    this.selectedContacts = [];
    this.attachmentArray = [];
    this.excelMsgArray = [];
    this.sheetData = null;
    this.sheetHeaders = null;
    this.sheetSelectedFlag = false;
    const defaultCountry = this.countriesData.find(country => country.code === 'IN') || null;
    this.selectedOption = '1';
    this.myForm.reset({
      country: defaultCountry,
      phone: '',
      message: '',
      search: '',
      msgTimeGap: '',
      batch: '',
      batchTimeGap: '',
      header: []
    });
    this.filteredContacts = [...this.allContactData];
    try {
      await this.chromeService.remove(['popupState', 'attachmentsData']);
    } catch (error) {
      console.error('Error clearing saved state:', error);
    }
  }

  sendMessage(): void {
    if (this.selectedOption == '1') {
      if (this.attachmentArray && this.attachmentArray.length > 0) {
        const attachmentPayload = this.createAttachmentPayload();
        this.isProcessing = true; this.statusText = null;
        chrome.runtime.sendMessage(attachmentPayload, (response) => {
          if (response && response.success) {
            console.log('Attachment sent successfully');
          } else {
            console.error('Failed to send attachment:', response.error);
          }
        });
      } else if (this.sheetData && this.sheetData.length > 0) {
        this.createExcelPayload();
        const messageData = {
          type: 'SEND_MESSAGE',
          excelArray: this.excelMsgArray,
          msgTimeGap: (this.myForm.get('msgTimeGap')?.value) * 1000,
          batch: this.myForm.get('batch')?.value,
          batchTimeGap: (this.myForm.get('batchTimeGap')?.value) * 1000

        };
        this.isProcessing = true; this.statusText = null;
        chrome.runtime.sendMessage(messageData, (response) => {
          if (response && response.success) {
            console.log('Message sent successfully');
          } else {
            console.error('Failed to send message:', response.error);
          }
        });
      } else {
        const payload = this.createMessagePayload()
        // Send message via the background script 
        if (payload) { this.isProcessing = true; this.statusText = null; }
        chrome.runtime.sendMessage(payload, (response) => {
          if (response && response.success) {
            console.log('Message sent successfully');
          } else {
            console.error('Failed to send message:', response.error);
          }
        });
      }
    }

    if (this.selectedOption == '2') {
      if (this.attachmentArray && this.attachmentArray.length > 0) {
        const attachmentPayload = this.createGroupAttachmentPayload();
        this.isProcessing = true; this.statusText = null;
        chrome.runtime.sendMessage(attachmentPayload, (response) => {
          if (response && response.success) {
            console.log('Attachment sent successfully');
          } else {
            console.error('Failed to send attachment:', response.error);
          }
        });
      } else {
        const message = this.myForm.get('message')?.value;
        const messageData = {
          type: 'SEND_MESSAGE_TO_GROUP',
          groupArray: this.whatsappGroupArray,
          messageContent: message
        };
        this.isProcessing = true; this.statusText = null;
        chrome.runtime.sendMessage(messageData, (response) => {
          if (response && response.success) {
            console.log('Message sent successfully');
          } else {
            console.error('Failed to send message:', response.error);
          }
        });
      }

    }

    if (this.selectedOption == '3') {
      if (this.attachmentArray && this.attachmentArray.length > 0) {
        const attachmentPayload = this.createContactAttachmentPayload();
        this.isProcessing = true; this.statusText = null;
        chrome.runtime.sendMessage(attachmentPayload, (response) => {
          if (response && response.success) {
            console.log('Attachment sent successfully');
          } else {
            console.error('Failed to send attachment:', response.error);
          }
        });
      } else {
        const payload = this.createSelectedContactsMsgPayload()
        // Send message via the background script 
        if (payload) { this.isProcessing = true; this.statusText = null; }
        chrome.runtime.sendMessage(payload, (response) => {
          if (response && response.success) {
            console.log('Message sent successfully');
          } else {
            console.error('Failed to send message:', response.error);
          }
        });
      }
    }

  }

  createContactAttachmentPayload() {
    let contactArray: any = [];
    const message = this.myForm.get('message')?.value;
    this.selectedContacts.forEach((obj: any) => {
      contactArray.push(obj?.id?.user)
    })
    const messageData = {
      type: 'SEND_ATTACHMENTS',
      phoneNumber: contactArray,
      messageContent: message
    };

    return messageData;
  }

  createSelectedContactsMsgPayload() {
    const country = [this.myForm.get('country')?.value];
    let contactArray: any = [];
    const message = this.myForm.get('message')?.value;
    this.selectedContacts.forEach((obj: any) => {
      contactArray.push(obj?.id?.user)
    })

    if (!country || !contactArray || !message) {
      alert('Please select country code and enter both phone number and message.');
      return;
    }
    const messageData = {
      type: 'SEND_MESSAGE',
      phoneNumber: contactArray,
      messageContent: message
    };
    return messageData;
  }

  createAttachmentPayload() {
    this.createExcelPayload();
    const message = this.myForm.get('message')?.value;
    const phoneNumbersArray = this.phoneNumbersArray;
    const messageData = {
      type: 'SEND_ATTACHMENTS',
      phoneNumber: this.formatPhoneNumbers(phoneNumbersArray),
      messageContent: message,
      msgTimeGap: (this.myForm.get('msgTimeGap')?.value) * 1000,
      batch: this.myForm.get('batch')?.value,
      batchTimeGap: (this.myForm.get('batchTimeGap')?.value) * 1000
    };
    return messageData;
  }

  createGroupAttachmentPayload() {
    const messageData = {
      type: 'SEND_ATTACHMENT_TO_GROUP',
      groupArray: this.whatsappGroupArray,
      caption: ''
    };
    return messageData;
  }

  createMessagePayload() {
    const country = [this.myForm.get('country')?.value];
    const phoneNumbersArray = this.phoneNumbersArray;
    const message = this.myForm.get('message')?.value;
    if (!country || !phoneNumbersArray || !message) {
      alert('Please select country code and enter both phone number and message.');
      return;
    }
    const messageData = {
      type: 'SEND_MESSAGE',
      phoneNumber: this.formatPhoneNumbers(phoneNumbersArray),
      messageContent: message,
      msgTimeGap: (this.myForm.get('msgTimeGap')?.value) * 1000,
      batch: this.myForm.get('batch')?.value,
      batchTimeGap: (this.myForm.get('batchTimeGap')?.value) * 1000
    };
    return messageData;
  }

  createExcelPayload(): void {
    if (this.sheetData && this.phoneNumbersArray.length) {
      this.excelMsgArray = this.phoneNumbersArray.map((phoneNumber) => ({
        number: this.formatPhoneNumbers([phoneNumber]),
        message: this.getMessage(phoneNumber),
      }));
    }
  }

  getMessage(phoneNo: any): string {
    const result = this.sheetData.find((item: any[]) => item[0]?.toString() === phoneNo);
    const formMsg = this.myForm.get('message')?.value;
    if (!result) {
      return "No matching record found.";
    }

    // Dynamically map the headers to their corresponding values
    const placeholders: Record<string, string> = this.sheetHeaders.reduce((acc: Record<string, string>, header: string, index: number) => {
      acc[header] = result[index] || ''; // Map each header to the corresponding value in the row
      return acc;
    }, {});

    return this.replacePlaceholders(formMsg, placeholders);
  }

  replacePlaceholders(message: string, placeholders: Record<string, string>): string {
    return Object.keys(placeholders).reduce((updatedMessage, key) => {
      const regex = new RegExp(`{{${key}}}`, 'g'); // Create a dynamic regex for each placeholder
      return updatedMessage.replace(regex, placeholders[key] || '');
    }, message);
  }

  formatPhoneNumbers(phoneNumbersArray: any) {
    const country = [this.myForm.get('country')?.value];
    return phoneNumbersArray.map((num: string) => country[0]?.dial_code.replace('+', '') + num);
  }

  onAttachmentClick() {
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx, .xls, .pdf, .docx, .png, .jpg'; // Specify accepted file types if needed
    fileInput.multiple = true; // Allow multiple file selection

    // Handle the file selection
    fileInput.onchange = (event: Event) => {
      const input = event.target as HTMLInputElement;

      // Check if files exist
      if (input.files && input.files.length > 0) {
        const selectedFiles: File[] = Array.from(input.files); // Convert FileList to File[]
        selectedFiles.forEach(file => this.saveFileToStorage(file)); // Save each file
      }
    };
    // Trigger the file input click
    fileInput.click();
  }

  // Save the selected file to Chrome's local storage
  saveFileToStorage(file: File) {
    const reader = new FileReader();

    // Convert the file to a base64 string
    reader.onload = () => {
      const base64String = reader.result as string;

      // Initialize the attachment array if it's not already defined
      if (!this.attachmentArray) {
        this.attachmentArray = [];
      }

      // Add the file to the attachment array
      this.attachmentArray.push({
        name: file.name,
        data: `"${base64String}"`// Store the base64 string directly
      });
      this.persistState();

      // Save the updated attachment array to Chrome storage
      chrome.storage.local.set({ attachmentsData: this.attachmentArray }, () => {
        console.log('File saved to Chrome storage:', this.attachmentArray);
      });
    };
    // Read the file as a data URL (base64)
    reader.readAsDataURL(file);
  }

  removeFile(index: number) {
    if (this.attachmentArray) {
      // Remove the file from the array
      this.attachmentArray.splice(index, 1);
      this.persistState();
      // Update Chrome storage
      chrome.storage.local.set({ attachmentsData: this.attachmentArray }, () => {
        console.log('File removed from Chrome storage:', this.attachmentArray);
      });
    }
  }


  // Trigger the hidden file input's click event
  triggerFileInput(): void {
    const fileInput = document.querySelector<HTMLInputElement>('#fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const binaryData = e.target.result;
        const workbook = XLSX.read(binaryData, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
  
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'hh:mm:ss' });
        this.sheetHeaders = jsonData[0] || [];
        this.sheetData = jsonData.slice(1).filter((row: any) => row.length > 0);
  
        this.sheetData.forEach((element: any) => {
          if (element[0] && /^\d+$/.test(element[0].toString().trim())) { // Ensure only valid numbers
            this.phoneNumbersArray.push(element[0].toString().trim());
          }
        });

       // Function to check if a value is a valid time string
       const isTimeString = (value: string) => {
        return /^\d{1,2}:\d{2}(:\d{2})?$/.test(value); // Matches "HH:MM" or "HH:MM:SS"
      };

      // Function to convert a time string to 12-hour format with AM/PM
      const convertTo12HourFormat = (timeString: string) => {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, seconds || 0); // Set the time on a valid date
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      };

      // Iterate through each row and column to detect and convert time values
      this.sheetData.forEach((row: any) => {
        row.forEach((value: any, index: number) => {
          if (typeof value === 'string' && isTimeString(value)) {
            row[index] = convertTo12HourFormat(value); // Convert to 12-hour format
          }
        });
      });
  
        console.log(this.sheetData);
      };
      reader.readAsBinaryString(file);
    }
    this.sheetSelectedFlag = true;
    this.persistState();
  }
  
  // onFileChange(event: any): void {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = (e: any) => {
  //       const binaryData = e.target.result;
  //       const workbook = XLSX.read(binaryData, { type: 'binary' });
  //       const sheetName = workbook.SheetNames[0];
  //       const sheet = workbook.Sheets[sheetName];

  //       const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  //       this.sheetHeaders = jsonData[0] || [];
  //       this.sheetData = jsonData.slice(1).filter((row: any) => row.length > 0);
  //       this.sheetData.forEach((element: any) => {
  //         if (element[0] && /^\d+$/.test(element[0].toString().trim())) { // Ensure only valid numbers
  //           this.phoneNumbersArray.push(element[0].toString().trim());
  //         }
  //       });
  //     };
  //     reader.readAsBinaryString(file);
  //   }
  //   this.sheetSelectedFlag = true;
  // }

  onSheetHeaderSelect(event: any) {
    if (event.value) {
      const currentMessage = this.myForm.get('message')?.value || '';
      const newMessage = `${currentMessage} {{${event.value}}}`.trim();
      this.myForm.get('message')?.setValue(newMessage);
    }
  }

  onPhoneInput(event: any): void {
    let input = event.target.value || '';

    // Allow only digits and commas in the raw input
    input = input.replace(/[^0-9,]/g, ''); // Remove invalid characters

    // Process the input to extract valid 10-digit numbers
    const numbers = input
      .split(',')
      .map((num: string) => num.replace(/\D/g, '').slice(-10)) // Clean and limit to last 10 digits
      .filter((num: string) => num.length === 10); // Keep only valid 10-digit numbers

    // Prepare the final value for the input
    const sanitizedValue = numbers.join(', ');

    // Set the value back to the form control
    if (sanitizedValue) {
      // If valid numbers exist, use sanitized value
      this.myForm.controls['phone'].setValue(sanitizedValue, { emitEvent: false });
    } else {
      // If no valid numbers, fallback to raw sanitized input (partial numbers)
      this.myForm.controls['phone'].setValue(input, { emitEvent: false });
    }
  }

  // Handle paste event
  onPaste(event: ClipboardEvent): void {
    event.preventDefault(); // Prevent default paste behavior

    const pastedText = event.clipboardData?.getData('text').trim();
    if (!pastedText) return;

    // Split by commas, spaces, or newlines
    const numbers = pastedText.split(/[\s,\n]+/);

    // Add only valid numbers to the array
    numbers.forEach(number => {
      if (/^\d+$/.test(number.trim())) { // Ensure it contains only digits
        this.phoneNumbersArray.push(number.trim());
      }
    });
    this.persistState();

    // Clear the input field
    this.myForm.get('phone')?.setValue('');
  }

  // Handle input event
  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.trim();

    // Check if the input is a valid 10-digit number
    if (this.isValidPhoneNumber(value)) {
      this.phoneNumbersArray.push(value);
      inputElement.value = ''; // Clear the input field
      this.persistState();
    }
  }

  // Validate if the input is a 10-digit number
  isValidPhoneNumber(number: string): boolean {
    return /^\d{10}$/.test(number); // Regex to check for exactly 10 digits
  }

  // Handle keypress event to restrict input to numbers only
  onKeyPress(event: KeyboardEvent): void {
    const allowedChars = /[0-9]/; // Only allow numeric characters
    if (!allowedChars.test(event.key)) {
      event.preventDefault(); // Prevent non-numeric input
    }
  }

  downloadContactExcel() {
    // Flatten the data for Excel export
    const flattenedData = this.allContactData.map((group: any) => ({
      user: group.id.user,
      name: group.name,
    }));

    this.excelService.exportToExcel(flattenedData, 'Contacts');
  }

  downloadGroupDataCsv() {
    const messageData = {
      type: 'DOWNLOAD_GROUP_CONTACT',
      groupArray: this.whatsappGroupArray
    };
    chrome.runtime.sendMessage(messageData, (response) => {
      if (response && response.success) {
        console.log('group id sent successfully');
      } else {
        console.error('Failed to send attachment:', response.error);
      }
    });
  }

  onRadioOptionChange(event: any) {
    this.selectedOption = event.value;
    this.myForm.get('message')?.setValue(null);
    this.persistState();
  }

  addWhatsappGroup(event: any): void {
    const value = (event.value || '');
    // Add the group if it is valid and not already added
    if (value.name && !this.whatsappGroupArray.some(obj => obj.name === value.name)) {
      this.whatsappGroupArray.push(value);
      this.persistState();
    }
  }

  removeWhatsappGroup(index: number) {
    if (index >= 0) {
      this.whatsappGroupArray.splice(index, 1); // Remove the number
      this.persistState();
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (!this.clickedInside) {
      this.showDropdown = false;
    }
    this.clickedInside = false; // Reset the flag
  }

  onInputFocus() {
    this.clickedInside = true;
    this.showDropdown = true; // Open the dropdown
  }

  onDropdownClick() {
    this.clickedInside = true; // Ensure dropdown stays open
  }

  filterContacts() {
    const searchTerm = this.myForm.get('search')?.value.toLowerCase() || '';
    this.filteredContacts = this.allContactData.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm)
    );
  }

  selectContact(contact: any) {
    this.selectedContacts.push(contact);
    this.myForm.get('search')?.setValue('');
    this.filteredContacts = this.filteredContacts.filter(c => c !== contact);
    this.showDropdown = false;
    this.persistState();
  }

  removeFromSelected(contact: any) {
    this.selectedContacts = this.selectedContacts.filter(c => c !== contact);
    // Add to filteredContacts if not already present    
    if (!this.filteredContacts.some(c => c.id._serialized === contact.id._serialized)) {
      this.filteredContacts = [...this.filteredContacts, contact];
    }
    this.persistState();
  }

  closeDropdown() {
    this.showDropdown = false;
  }

}

