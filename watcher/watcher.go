package watcher

import (
	"log"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
	"github.com/aerobudget/aerobudget/importer"
)

// Watch starts watching the specified directory for new PDF invoices.
func Watch(dir string) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	defer watcher.Close()

	done := make(chan bool)
	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Op&fsnotify.Create == fsnotify.Create {
					log.Printf("New file detected: %s", event.Name)
					if strings.ToLower(filepath.Ext(event.Name)) == ".pdf" {
						processNewInvoice(event.Name)
					}
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("Watcher error:", err)
			}
		}
	}()

	err = watcher.Add(dir)
	if err != nil {
		return err
	}
	log.Printf("Started watching directory: %s", dir)
	<-done

	return nil
}

func processNewInvoice(filePath string) {
	log.Printf("Processing invoice: %s", filePath)
	
	// Extract text using pdftotext
	text, err := importer.ExtractText(filePath)
	if err != nil {
		log.Printf("Error extracting text from %s: %v", filePath, err)
		return
	}

	// Parse extracted text
	invoice, err := importer.ParseInvoiceText(text)
	if err != nil {
		log.Printf("Error parsing invoice %s: %v", filePath, err)
		return
	}

	log.Printf("Successfully parsed invoice %s: %v", invoice.InvoiceNumber, invoice)
	
	// TODO: Save invoice to database and trigger Matcher to correlate with flights
}
