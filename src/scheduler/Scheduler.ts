import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Log from "../Util";

export default class Scheduler implements IScheduler {
    private scheduledSections: any = {};
    private scheduledRooms: any = {};
    private distance: any = {};
    private ts: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100", "MWF 1100-1200", "MWF 1200-1300",
        "MWF 1300-1400", "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700", "TR  0800-0930", "TR  0930-1100",
        "TR  1100-1230", "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];

    constructor() {
        //
    }

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let rt: any = {};
        this.getDistance(rooms);
        // Log.trace(this.distance);
        rooms.sort(function (a, b) {
            return (a.rooms_seats > b.rooms_seats) ? 1 : (b.rooms_seats > a.rooms_seats) ? -1 : 0;
        });
        while (sections.length > 0) {
            let section = sections.shift();
            if (!this.scheduledSections.hasOwnProperty(section.courses_dept)) {
                this.scheduledSections[section.courses_dept] = {};
            }
            if (!this.scheduledSections[section.courses_dept].hasOwnProperty(section.courses_id)) {
                this.scheduledSections[section.courses_dept][section.courses_id] = {room: [], time: []};
            }
            this.addHelper(section, rooms, sections, rt);
            if (Object.keys(rt).length === rooms.length * 15) {
                break;
            }
        }
        // Log.trace(rt);
        return rt;
    }

    private calcDist(room1: SchedRoom, room2: SchedRoom): number {
        let R = 6371e3;
        let lat1 = room1.rooms_lat;
        let lat2 = room2.rooms_lat;
        let lon1 = room1.rooms_lon;
        let lon2 = room2.rooms_lon;
        let dLat = this.deg2rad(lat1 - lat2);
        let dLon = this.deg2rad(lon1 - lon2);

        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    private addHelper(section: SchedSection, rooms: SchedRoom[], sections: SchedSection[], rt: any) {
        let min: number = Number.MAX_SAFE_INTEGER;
        let minR: SchedRoom;
        let sTime: TimeSlot;
        let sec: any = this.scheduledSections[section.courses_dept][section.courses_id];
        for (let room of rooms) {
            if (!this.scheduledRooms.hasOwnProperty(room.rooms_name)) {
                this.scheduledRooms[room.rooms_name] = {sections: [], times: []};
            }
            if (room.rooms_seats < section.courses_fail + section.courses_pass + section.courses_audit) {
                continue;
            }
            let timeRoom: TimeSlot[] = this.scheduledRooms[room.rooms_name].times;
            for (let time of this.ts) {
                if (sec.time.includes(time)) {
                    continue;
                }
                let check: any[];
                if (timeRoom.length === 15) {
                    check = this.checkMax(room, section, rt, min);
                } else {
                    check = this.addCheck(section, room, min);
                }
                if (check[0]) {
                    min = check[1];
                    minR = room;
                    sTime = time;
                }
            }
        }
        if (minR) {
            this.scheduledRooms[minR.rooms_name].times.push(sTime);
            this.scheduledRooms[minR.rooms_name].sections.push(section);
            this.scheduledSections[section.courses_dept][section.courses_id].room.push(minR);
            this.scheduledSections[section.courses_dept][section.courses_id].time.push(sTime);
            rt[section.courses_uuid] = [section, minR, sTime];
        } else {
            sections.push(section);
        }
    }

    private checkMax(room: SchedRoom, section: SchedSection, rt: any, min: number): any[] {
        let numSeats: number = room.rooms_seats;
        let newCap: number = numSeats - (section.courses_fail + section.courses_pass + section.courses_audit);
        for (let booked = 0; booked < this.scheduledRooms[room.rooms_name].sections.length; booked++) {
            let scheduled: SchedSection = this.scheduledRooms[room.rooms_name].sections[booked];
            let oldCap: number = numSeats - (scheduled.courses_pass + scheduled.courses_fail + scheduled.courses_audit);
            let oldTime: TimeSlot = this.scheduledRooms[room.rooms_name].times[booked];
            let time: boolean = this.scheduledSections[section.courses_dept][section.courses_id].time.includes(oldTime);
            if (newCap < oldCap && !time) {
                let rt0: any[] = this.addCheck(section, room, min);
                if (rt0[0] && rt[1] < min) {
                    this.updateSections(room, scheduled, booked, rt);
                    return rt0;
                }
            }
        }
        return [false, 0];
    }

    private updateSections(room: SchedRoom, tr: SchedSection, index: number, rt: any) {
        this.scheduledRooms[room.rooms_name].sections.slice(index);
        this.scheduledRooms[room.rooms_name].times.slice(index);
        delete rt[tr.courses_uuid];
        let ind: number = this.scheduledSections[tr.courses_dept][tr.courses_id].room.indexOf(room.rooms_name);
        this.scheduledSections[tr.courses_dept][tr.courses_id].room.slice(ind);
        this.scheduledSections[tr.courses_dept][tr.courses_id].time.slice(ind);
    }

    private addCheck(section: SchedSection, room: SchedRoom, dist: number): any[] {
        let nearby: SchedRoom[] = this.scheduledSections[section.courses_dept][section.courses_id].room;
        let min: number = dist;
        if (nearby.length < 1) {
            return [true, 0];
        }
        for (let near of nearby) {
            if (near.rooms_name === room.rooms_name) {
                return [true, 0];
            }
            if (min >= this.distance[near.rooms_name][room.rooms_name]) {
                min = this.distance[near.rooms_name][room.rooms_name];
            }
        }
        let rt: boolean = min <= dist;
        return [rt, min];
    }

    private getDistance(rooms: SchedRoom[]) {
        for (let i = 0; i < rooms.length; i++) {
            for (let j = i + 1; j < rooms.length; j++) {
                if (!this.distance.hasOwnProperty(rooms[i].rooms_name)) {
                    this.distance[rooms[i].rooms_name] = {};
                }
                if (!this.distance.hasOwnProperty(rooms[j].rooms_name)) {
                    this.distance[rooms[j].rooms_name] = {};
                }
                let dist: number = this.calcDist(rooms[i], rooms[j]);
                this.distance[rooms[i].rooms_name][rooms[j].rooms_name] = dist;
                this.distance[rooms[j].rooms_name][rooms[i].rooms_name] = dist;
            }
        }
    }
}

