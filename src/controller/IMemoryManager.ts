export interface IMemoryManager {

    helpInitialize(dataset: any, forListDS: any): any;
    alreadyInDisk(id: string): Promise<boolean>;
    writeToMemory(id: string): Promise<boolean>;
    parseFile(text: any): any;
    checkValidSections(validSection: any[]): number;
    isSectionValid(section: any): boolean;
    // // adds a section to the internal data structure
    // addSection(section: any): any;
    // // helper for addSection
    // // called when the key of section to be added is already in the data structure
    // addHelperSectionEqualsOverall(section: any, key: any): any;
    // // helper for addSection
    // //  called when the key of section to be added isn't in the data structure
    // addHelperSectionNotEqualsOverall(section: any, key: any): any;
    // deleteFromMemory(path: string): Promise<boolean>;
    // retrieveDataset(path: string): any;

}
