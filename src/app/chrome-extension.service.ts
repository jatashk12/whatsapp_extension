import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChromeExtensionService {
  private countriesUrl = 'assets/country_dial_info.json';

  constructor(private http: HttpClient) { 
  }

   // Function to interact with chrome runtime to send messages
   sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(response);
        }
      });
    });
  }

  openTab(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url }, (tab:any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve();
        }
      });
    });
  }
  
  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(this.countriesUrl);
  }

  get<T>(keys: string | string[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else {
            resolve(result as T);
          }
        });
      } else {
        reject('Chrome storage API is not available.');
      }
    });
  }

  // Set a value in Chrome Storage
  set(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else {
            resolve();
          }
        });
      } else {
        reject('Chrome storage API is not available.');
      }
    });
  }

  remove(key: string | string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else {
            resolve();
          }
        });
      } else {
        reject('Chrome storage API is not available.');
      }
    });
  }
  
}
